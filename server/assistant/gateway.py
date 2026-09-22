"""Private, bounded WAVE adapter for an existing local Ollama instance.

Only the WAVE server can authenticate. Never expose Ollama itself. No prompts,
tokens, request bodies, or travel preferences are logged or persisted.
"""
import hmac
import base64
import binascii
import json
import os
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get('WAVE_GATEWAY_TOKEN', '')
MODEL = os.environ.get('WAVE_GATEWAY_MODEL', 'gemma4:26b')
OLLAMA = os.environ.get('WAVE_OLLAMA_URL', 'http://127.0.0.1:11434')
PORT = int(os.environ.get('WAVE_GATEWAY_PORT', '18765'))
BACKEND = os.environ.get('WAVE_MODEL_BACKEND', 'ollama')
LM_STUDIO = os.environ.get('WAVE_LM_STUDIO_URL', 'http://127.0.0.1:1234').rstrip('/')
# The shared DSW runtime defaults to CPU. A dedicated runtime can opt into GPU.
GPU_LAYERS = int(os.environ.get('WAVE_OLLAMA_GPU_LAYERS', '0'))
ACTIVE = threading.BoundedSemaphore(1)
RATE_LOCK = threading.Lock()
RECENT = []
FORMAT = {'type': 'object', 'properties': {
    'reply': {'type': 'string'},
    'proposal': {'anyOf': [{'type': 'null'}, {'type': 'object', 'properties': {
          'action': {'type': 'string', 'enum': ['create-itinerary', 'adapt-itinerary', 'set-dates', 'recalculate-route', 'save-trip', 'settings', 'search', 'add', 'remove', 'details', 'move', 'visit', 'break', 'day', 'start-time', 'deadline', 'readiness', 'compare', 'alternatives', 'next', 'undo', 'tool', 'help']}, 'region': {'type': 'string', 'enum': ['경남 전체', '창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산', '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양', '거창', '합천']},
        'profiles': {'type': 'array', 'items': {'type': 'string', 'enum': ['route', 'elevator', 'restroom', 'parking', 'wheelchair', 'stroller', 'lactationroom', 'babysparechair', 'braileblock', 'helpdog', 'guidehuman', 'audioguide', 'bigprint', 'signguide', 'videoguide', 'hearingroom', 'wheel', 'senior', 'baby', 'pregnant', 'visual', 'hearing']}},
        'themes': {'type': 'array', 'items': {'type': 'string', 'enum': ['nature', 'history', 'leisure', 'food']}},
        'placeId': {'type': 'string'}, 'minutes': {'type': 'integer'},
        'direction': {'type': 'string'}, 'date': {'type': 'string'},
        'time': {'type': 'string'}, 'tool': {'type': 'string'},
        'start': {'type': 'string'}, 'end': {'type': 'string'}, 'indoor': {'type': 'boolean'},
        'pace': {'type': 'string', 'enum': ['relaxed', 'standard']},
        'transport': {'type': 'string', 'enum': ['walk', 'bicycle', 'transit', 'car']},
          'originRegion': {'type': 'string', 'enum': ['창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산', '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양', '거창', '합천']}, 'festival': {'type': 'string', 'minLength': 1},
        'reason': {'type': 'string', 'enum': ['rain', 'fatigue', 'change', 'closed']}},
        'required': ['action'], 'additionalProperties': False}]}
}, 'required': ['reply', 'proposal'], 'additionalProperties': False}
# Duration edits are incomplete without both the target and numeric duration.
# Constrain generation as well as the application's independent validation.
_action_schema = FORMAT['properties']['proposal']['anyOf'][1]
_duration_schema = json.loads(json.dumps(_action_schema))
_duration_schema['properties']['action']['enum'] = ['visit', 'break']
_duration_schema['required'] = ['action', 'placeId', 'minutes']
_action_schema['properties']['action']['enum'] = [
    action for action in _action_schema['properties']['action']['enum']
    if action not in ('visit', 'break')]
FORMAT['properties']['proposal']['anyOf'].append(_duration_schema)
PHOTO_FORMAT = {'type': 'object', 'properties': {
    'reply': {'type': 'string'}, 'proposal': {'type': 'null'},
    'facts': {'type': 'array', 'maxItems': 4, 'items': {
        'type': 'object', 'properties': {
            key: {'type': 'string'} for key in
            ('name', 'region', 'date', 'startTime', 'endTime', 'address')
        }, 'required': ['name', 'region', 'date', 'startTime', 'endTime', 'address'],
        'additionalProperties': False}}
}, 'required': ['reply', 'proposal', 'facts'], 'additionalProperties': False}


def validate_photo_messages(messages):
    has_photo = False
    for index, message in enumerate(messages):
        if 'images' not in message:
            continue
        images = message['images']
        if index != len(messages) - 1 or message['role'] != 'user' or not isinstance(images, list) or len(images) != 1 or not isinstance(images[0], str) or len(images[0]) > 1066668:
            raise ValueError('invalid_photo')
        data = base64.b64decode(images[0], validate=True)
        if len(data) > 800000 or data[:2] != b'\xff\xd8' or data[-2:] != b'\xff\xd9':
            raise ValueError('invalid_photo')
        offset, dimensions, scanned = 2, False, False
        while offset + 1 < len(data):
            if data[offset] != 255:
                raise ValueError('invalid_photo')
            marker = data[offset + 1]
            offset += 2
            if marker == 217:
                if not dimensions or not scanned or offset != len(data):
                    raise ValueError('invalid_photo')
                break
            if marker == 254 or 225 <= marker <= 239:
                raise ValueError('photo_metadata')
            length = int.from_bytes(data[offset:offset + 2], 'big')
            if length < 2 or offset + length > len(data):
                raise ValueError('invalid_photo')
            if marker in (192, 193, 194):
                height = int.from_bytes(data[offset + 3:offset + 5], 'big')
                width = int.from_bytes(data[offset + 5:offset + 7], 'big')
                if length < 8 or not 0 < width <= 1600 or not 0 < height <= 1600:
                    raise ValueError('photo_dimensions')
                dimensions = True
            offset += length
            if marker == 218:
                if not dimensions:
                    raise ValueError('invalid_photo')
                scanned = True
                while offset + 1 < len(data):
                    if data[offset] != 255:
                        offset += 1
                        continue
                    next_marker = data[offset + 1]
                    if next_marker == 0 or 208 <= next_marker <= 215:
                        offset += 2
                        continue
                    if next_marker == 255:
                        offset += 1
                        continue
                    break
        else:
            raise ValueError('invalid_photo')
        if not dimensions:
            raise ValueError('invalid_photo')
        has_photo = True
    return has_photo


def lm_messages(messages):
    result = []
    for message in messages:
        content = message['content']
        if message.get('images'):
            content = [{'type': 'text', 'text': content},
                       {'type': 'image_url', 'image_url': {
                           'url': 'data:image/jpeg;base64,' + message['images'][0]}}]
        result.append({'role': message['role'], 'content': content})
    return result


def model_ready():
    url = LM_STUDIO + '/api/v1/models' if BACKEND == 'lmstudio' else OLLAMA + '/api/ps'
    with urllib.request.urlopen(url, timeout=3) as response:
        data = json.loads(response.read(262144))
    if BACKEND == 'lmstudio':
        return any(instance.get('id') == MODEL
                   for model in data.get('models', [])
                   for instance in model.get('loaded_instances', []))
    return any(model.get('name') == MODEL for model in data.get('models', []))


def model_request(messages, has_photo, streaming):
    if BACKEND == 'lmstudio':
        payload = {'model': MODEL, 'messages': lm_messages(messages),
                   'stream': streaming, 'temperature': 0, 'max_tokens': 900 if has_photo else 500,
                   'reasoning_effort': 'none'}
        if not streaming:
            payload['response_format'] = {'type': 'json_schema', 'json_schema': {
                'name': 'naru', 'strict': True,
                'schema': PHOTO_FORMAT if has_photo else FORMAT}}
        url = LM_STUDIO + '/v1/chat/completions'
    else:
        payload = {'model': MODEL, 'messages': messages, 'stream': streaming,
                   'think': False, 'keep_alive': -1,
                   'options': {'num_gpu': GPU_LAYERS, 'num_thread': 8, 'num_ctx': 8192,
                               'num_batch': 256, 'draft_num_predict': 0,
                               'num_predict': 900 if has_photo else 320, 'temperature': 0}}
        if not streaming:
            payload['format'] = PHOTO_FORMAT if has_photo else FORMAT
        url = OLLAMA + '/api/chat'
    return urllib.request.Request(url, data=json.dumps(payload).encode(),
                                  headers={'Content-Type': 'application/json'})


class BoundedServer(ThreadingHTTPServer):
    daemon_threads = True
    connections = threading.BoundedSemaphore(16)

    def process_request(self, request, address):
        if not self.connections.acquire(blocking=False):
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, address)
        except Exception:
            self.connections.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.connections.release()


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.0'

    def log_message(self, *_args):
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def respond(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        try:
            self.wfile.write(encoded)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def begin_stream(self):
        """Line-delimited JSON passthrough. No prompt, token or body is logged."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/x-ndjson; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()

    def relay_stream(self, request):
        """Forward model text as it arrives. The non-streaming path stays untouched."""
        started, total = False, 0
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                for line in response:
                    if len(line) > 65536:
                        break
                    if BACKEND == 'lmstudio':
                        if not line.startswith(b'data: '):
                            continue
                        line = line[6:].strip()
                        if line == b'[DONE]':
                            break
                    try:
                        frame = json.loads(line)
                    except ValueError:
                        continue
                    if not isinstance(frame, dict):
                        continue
                    piece = frame.get('message', {}).get('content', '') if isinstance(frame.get('message'), dict) else ''
                    if BACKEND == 'lmstudio':
                        choices = frame.get('choices', [])
                        piece = choices[0].get('delta', {}).get('content', '') if choices else ''
                    if isinstance(piece, str) and piece:
                        if total + len(piece) > 6000:
                            piece = piece[:6000 - total]
                        total += len(piece)
                        if not started:
                            self.begin_stream()
                            started = True
                        self.wfile.write((json.dumps({'choices': [{'delta': {'content': piece}}]}, ensure_ascii=False) + '\n').encode())
                        self.wfile.flush()
                        if total >= 6000:
                            break
                    if frame.get('done') is True:
                        break
            if not started:
                self.begin_stream()
                started = True
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            # A failure before any byte keeps the existing error contract.
            if not started:
                self.respond(503, {'error': 'model_unavailable'})

    def authenticated(self):
        return bool(TOKEN) and hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN)

    def do_GET(self):
        if not self.authenticated():
            return self.respond(401, {'error': 'unauthorized'})
        if self.path != '/v1/health':
            return self.respond(404, {'error': 'not_found'})
        try:
            ready = model_ready()
            self.respond(200 if ready else 503, {'ready': ready})
        except Exception:
            self.respond(503, {'ready': False})

    def do_POST(self):
        if not self.authenticated():
            return self.respond(401, {'error': 'unauthorized'})
        if self.path != '/v1/chat/completions':
            return self.respond(404, {'error': 'not_found'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            # Public API bounds one re-encoded JPEG plus text/system data.
            if not 0 < length <= 1120000 or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.respond(413, {'error': 'invalid_body'})
            body = json.loads(self.rfile.read(length))
            streamed = body.get('stream') is True
            messages = body.get('messages')
            if not isinstance(messages, list) or not 1 <= len(messages) <= 10:
                raise ValueError()
            for message in messages:
                if not isinstance(message, dict) or message.get('role') not in ('system', 'user', 'assistant') or not isinstance(message.get('content'), str) or len(message['content']) > 6000:
                    raise ValueError()
            has_photo = validate_photo_messages(messages)
            if not has_photo and length > 36000:
                raise ValueError()
            # Do not forward unrecognised client fields to the local runtime.
            messages = [{key: message[key] for key in ('role', 'content', 'images') if key in message} for message in messages]
        except (ValueError, TypeError, OSError, AttributeError, binascii.Error):
            return self.respond(400, {'error': 'invalid_body'})
        with RATE_LOCK:
            now = time.monotonic()
            RECENT[:] = [stamp for stamp in RECENT if now - stamp < 60]
            if len(RECENT) >= 12:
                return self.respond(429, {'error': 'busy'})
            RECENT.append(now)
        if not ACTIVE.acquire(blocking=False):
            return self.respond(429, {'error': 'busy'})
        # Photo review always keeps the schema-checked, non-streaming path.
        wants_stream = streamed and not has_photo
        try:
            request = model_request(messages, has_photo, wants_stream)
            if wants_stream:
                return self.relay_stream(request)
            with urllib.request.urlopen(request, timeout=40) as response:
                result = json.loads(response.read(32000))
            content = result.get('message', {}).get('content', '')
            if BACKEND == 'lmstudio':
                choice = result.get('choices', [{}])[0]
                if choice.get('finish_reason') != 'stop':
                    raise ValueError('incomplete')
                content = choice.get('message', {}).get('content', '')
            if not isinstance(content, str) or len(content) > 6000 or result.get('done_reason') == 'length':
                raise ValueError('incomplete')
            decoded = json.loads(content)
            if not isinstance(decoded, dict) or not isinstance(decoded.get('reply'), str):
                raise ValueError('invalid')
            self.respond(200, {'choices': [{'message': {'role': 'assistant', 'content': content}}]})
        except Exception:
            self.respond(503, {'error': 'model_unavailable'})
        finally:
            ACTIVE.release()


if __name__ == '__main__':
    if BACKEND not in ('ollama', 'lmstudio'):
        raise SystemExit('Unsupported WAVE_MODEL_BACKEND')
    if len(TOKEN) < 32:
        raise SystemExit('WAVE_GATEWAY_TOKEN must contain at least 32 characters')
    BoundedServer(('127.0.0.1', PORT), Handler).serve_forever()

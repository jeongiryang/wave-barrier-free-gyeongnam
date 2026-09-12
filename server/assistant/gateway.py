"""Private, bounded WAVE adapter for an existing local Ollama instance.

Only the WAVE server can authenticate. Never expose Ollama itself. No prompts,
tokens, request bodies, or travel preferences are logged or persisted.
"""
import hmac
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
# The shared DSW runtime defaults to CPU. A dedicated runtime can opt into GPU.
GPU_LAYERS = int(os.environ.get('WAVE_OLLAMA_GPU_LAYERS', '0'))
ACTIVE = threading.BoundedSemaphore(1)
RATE_LOCK = threading.Lock()
RECENT = []
FORMAT = {'type': 'object', 'properties': {
    'reply': {'type': 'string'},
    'proposal': {'anyOf': [{'type': 'null'}, {'type': 'object', 'properties': {
          'action': {'type': 'string', 'enum': ['create-itinerary', 'adapt-itinerary', 'set-dates', 'recalculate-route', 'save-trip', 'settings', 'search', 'add', 'remove', 'details', 'move', 'visit', 'break', 'day', 'start-time', 'deadline', 'readiness', 'compare', 'alternatives', 'next', 'undo', 'tool', 'help']}, 'region': {'type': 'string', 'enum': ['경남 전체', '창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산', '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양', '거창', '합천']},
        'profiles': {'type': 'array', 'items': {'type': 'string', 'enum': ['wheel', 'senior', 'baby', 'pregnant', 'visual', 'hearing']}},
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

    def authenticated(self):
        return bool(TOKEN) and hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + TOKEN)

    def do_GET(self):
        if not self.authenticated():
            return self.respond(401, {'error': 'unauthorized'})
        if self.path != '/v1/health':
            return self.respond(404, {'error': 'not_found'})
        try:
            with urllib.request.urlopen(OLLAMA + '/api/ps', timeout=3) as response:
                data = json.loads(response.read(65536))
            ready = any(model.get('name') == MODEL for model in data.get('models', []))
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
            # The public API admits 24 KB, then adds bounded system/context data.
            if not 0 < length <= 36000 or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.respond(413, {'error': 'invalid_body'})
            body = json.loads(self.rfile.read(length))
            messages = body.get('messages')
            if not isinstance(messages, list) or not 1 <= len(messages) <= 10:
                raise ValueError()
            for message in messages:
                if not isinstance(message, dict) or message.get('role') not in ('system', 'user', 'assistant') or not isinstance(message.get('content'), str) or len(message['content']) > 6000:
                    raise ValueError()
        except (ValueError, TypeError, OSError, AttributeError):
            return self.respond(400, {'error': 'invalid_body'})
        with RATE_LOCK:
            now = time.monotonic()
            RECENT[:] = [stamp for stamp in RECENT if now - stamp < 60]
            if len(RECENT) >= 12:
                return self.respond(429, {'error': 'busy'})
            RECENT.append(now)
        if not ACTIVE.acquire(blocking=False):
            return self.respond(429, {'error': 'busy'})
        try:
            payload = {'model': MODEL, 'messages': messages, 'stream': False,
                       'think': False, 'format': FORMAT, 'keep_alive': -1,
                       'options': {'num_gpu': GPU_LAYERS, 'num_thread': 8, 'num_ctx': 8192, 'num_batch': 256, 'draft_num_predict': 0,
                                   'num_predict': 320, 'temperature': 0.1}}
            request = urllib.request.Request(OLLAMA + '/api/chat', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=40) as response:
                result = json.loads(response.read(32000))
            content = result.get('message', {}).get('content', '')
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
    if len(TOKEN) < 32:
        raise SystemExit('WAVE_GATEWAY_TOKEN must contain at least 32 characters')
    BoundedServer(('127.0.0.1', PORT), Handler).serve_forever()

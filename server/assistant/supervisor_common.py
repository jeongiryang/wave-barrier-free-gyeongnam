"""Local recovery primitives. Never persist child output, URLs, env or prompts."""
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import socket
import subprocess
import threading
import time
import urllib.request


MODEL_CONTEXT = 16384  # Same explicit setting as gateway.MODEL_CONTEXT.


class Diagnostics:
    def __init__(self, root):
        root.mkdir(parents=True, exist_ok=True)
        self.logger = logging.Logger('wave-supervisor')
        handler = RotatingFileHandler(root / 'supervisor.log', maxBytes=262144, backupCount=3,
                                      encoding='utf-8')
        handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'))
        self.logger.addHandler(handler)
        self.last = {}
        self.lock = threading.Lock()

    def event(self, component, event, code=None, stage=None, category=None):
        # Call sites pass constants. Reject everything outside this vocabulary.
        if component not in {'supervisor', 'ollama', 'gateway', 'mint', 'daemon', 'server', 'model'}:
            component = 'supervisor'
        if event not in {'started', 'exited', 'unavailable', 'listener-busy', 'healthy',
                         'warm-start', 'warm-ready', 'warm-failed', 'foreign-model',
                         'context-mismatch', 'gateway-failure', 'stderr', 'stderr-memory', 'stderr-bind',
                         'stderr-timeout', 'already-running', 'configuration-error'}:
            event = 'unavailable'
        stage = stage if stage in {'request', 'response_json', 'completion', 'model_json', 'reply', 'stream'} else None
        category = category if category in {'http_error', 'timeout', 'invalid_json', 'incomplete', 'connection_error', 'invalid_response'} else None
        key = (component, event, code if type(code) is int else None, stage, category)
        with self.lock:
            now = time.monotonic()
            if now - self.last.get(key, -60) < 60:
                return
            self.last[key] = now
            self.logger.info(json.dumps({'component': component, 'event': event,
                                        **({('status' if event == 'gateway-failure' else 'code'): code} if type(code) is int else {}),
                                        **({'stage': stage} if stage else {}),
                                        **({'category': category} if category else {})}))


def drain_stderr(stream, diagnostic, component):
    # A small flushed gateway line must be recorded immediately. Oversized lines
    # are discarded through their newline, so a later fragment cannot impersonate
    # a structured gateway event. No raw line or fragment is ever persisted.
    discarding = False
    try:
        while chunk := stream.readline(2048):
            if discarding:
                discarding = not chunk.endswith(b'\n')
                continue
            if len(chunk) == 2048 and not chunk.endswith(b'\n'):
                discarding = True
                diagnostic.event(component, 'stderr')
                continue
            if component == 'gateway' and chunk.startswith(b'naru_gateway_failure '):
                try:
                    value = json.loads(chunk[len(b'naru_gateway_failure '):])
                    if isinstance(value, dict):
                        status = value.get('status')
                        diagnostic.event(component, 'gateway-failure',
                                         code=status if type(status) is int and (status == 0 or 100 <= status <= 599) else None,
                                         stage=value.get('stage') if isinstance(value.get('stage'), str) else None,
                                         category=value.get('category') if isinstance(value.get('category'), str) else None)
                        continue
                except (ValueError, UnicodeError):
                    pass
            lower = chunk.lower()
            event = ('stderr-memory' if b'out of memory' in lower else
                     'stderr-bind' if b'address already in use' in lower else
                     'stderr-timeout' if b'timeout' in lower else 'stderr')
            diagnostic.event(component, event)
    finally:
        stream.close()


def spawn(args, root, env, diagnostic, component, windows=False):
    process = subprocess.Popen(args, cwd=root, env=env, stdin=subprocess.DEVNULL,
                               stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                               creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0) if windows else 0)
    threading.Thread(target=drain_stderr, args=(process.stderr, diagnostic, component),
                     daemon=True).start()
    diagnostic.event(component, 'started')
    return process


def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=2):
            return True
    except OSError:
        return False


def request(port, path, payload=None, token=None, timeout=8):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}',
                                 data=None if payload is None else json.dumps(payload).encode(),
                                 headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        value = json.loads(response.read(1024 * 1024))
        if not isinstance(value, dict):
            raise ValueError('Invalid local response')
        return value


def acquire_lock(root, windows=False):
    root.mkdir(parents=True, exist_ok=True)
    handle = open(root / 'supervisor.lock', 'a+b')
    if handle.tell() == 0:
        handle.write(b'0')
        handle.flush()
    handle.seek(0)
    try:
        if windows:
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        return None
    return handle  # Keep it alive for the entire supervisor lifetime.


class Jobs:
    """Never terminate a live task; retain it and suppress duplicate launches."""
    def __init__(self, root, env, diagnostic, windows=False):
        self.root, self.env, self.diagnostic, self.windows = root, env, diagnostic, windows
        self.children = {}
        self.attempts = {}

    def start(self, component, args):
        child = self.children.get(component)
        if child is not None and child.poll() is None:
            return child
        if time.monotonic() - self.attempts.get(component, -300) < 60:
            return child
        if child is not None:
            self.diagnostic.event(component, 'exited', child.returncode)
        self.attempts[component] = time.monotonic()
        try:
            child = spawn(args, self.root, self.env, self.diagnostic, component, self.windows)
            self.children[component] = child
            return child
        except OSError:
            self.diagnostic.event(component, 'unavailable')
            return None

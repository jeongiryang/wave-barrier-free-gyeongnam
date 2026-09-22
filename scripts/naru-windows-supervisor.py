"""User-scoped Windows recovery for the dedicated WAVE runtime (no prompt logs)."""
import ctypes
import json
import msvcrt
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

ROOT = Path(os.environ['LOCALAPPDATA']) / 'WAVE' / 'naru-runtime'


def request(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request('http://127.0.0.1:18764' + path, data=data,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=180 if data else 5) as response:
        return json.load(response)


def start(args, env):
    return subprocess.Popen(args, cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            creationflags=subprocess.CREATE_NO_WINDOW)


def main():
    lock = open(ROOT / 'supervisor.lock', 'a+b')
    lock.seek(0)
    try:
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
    except OSError:
        return
    env = os.environ.copy()
    for line in (ROOT / 'private' / 'windows-gateway.env').read_text().splitlines():
        if '=' in line:
            key, value = line.split('=', 1)
            env[key] = value
    env.update(OLLAMA_HOST='127.0.0.1:18764', OLLAMA_MODELS=str(ROOT / 'models'),
               OLLAMA_CONTEXT_LENGTH='8192', OLLAMA_NUM_PARALLEL='1',
               OLLAMA_MAX_LOADED_MODELS='1', OLLAMA_NO_CLOUD='1', OLLAMA_KEEP_ALIVE='-1')
    # Keep the inference host awake while this explicitly enabled service runs.
    # Display sleep remains permitted; exiting restores normal power policy.
    ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
    ollama = gateway = None
    while True:
        try:
            loaded = request('/api/ps').get('models', [])
            if not any(m.get('name') == env['WAVE_GATEWAY_MODEL'] for m in loaded):
                request('/api/generate', {'model': env['WAVE_GATEWAY_MODEL'],
                        'keep_alive': -1, 'stream': False,
                        'options': {'num_ctx': 8192, 'num_gpu': 999}})
        except Exception:
            if ollama is None or ollama.poll() is not None:
                # A busy live listener is never killed or replaced.
                import socket
                try:
                    with socket.create_connection(('127.0.0.1', 18764), timeout=2):
                        pass
                except OSError:
                    ollama = start([str(ROOT / 'ollama-0.34.2' / 'ollama.exe'), 'serve'], env)
        try:
            req = urllib.request.Request('http://127.0.0.1:18765/v1/health',
                    headers={'Authorization': 'Bearer ' + env['WAVE_GATEWAY_TOKEN']})
            with urllib.request.urlopen(req, timeout=8):
                pass
        except Exception:
            import socket
            try:
                with socket.create_connection(('127.0.0.1', 18765), timeout=2):
                    pass
            except OSError:
                if gateway is None or gateway.poll() is not None:
                    gateway = start([sys.executable, str(ROOT / 'gateway.py')], env)
        time.sleep(15)


if __name__ == '__main__':
    main()

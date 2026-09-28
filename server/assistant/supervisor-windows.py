"""Dedicated WAVE Windows listener recovery. No process kills or model eviction."""
import ctypes
import os
from pathlib import Path
import sys
import threading
import time
from supervisor_common import Diagnostics, Jobs, acquire_lock, listening, request, MODEL_CONTEXT


def runtime_env(root):
    env = os.environ.copy()
    for line in (root / 'private' / 'windows-gateway.env').read_text(encoding='utf-8-sig').splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            env[key.strip()] = value
    if not env.get('WAVE_GATEWAY_MODEL') or not env.get('WAVE_GATEWAY_TOKEN'):
        raise ValueError('Missing local configuration')
    env.update(OLLAMA_HOST='127.0.0.1:18764', OLLAMA_MODELS=str(root / 'models'),
               OLLAMA_CONTEXT_LENGTH=str(MODEL_CONTEXT), OLLAMA_NUM_PARALLEL='1',
               OLLAMA_MAX_LOADED_MODELS='1', OLLAMA_NO_CLOUD='1', OLLAMA_KEEP_ALIVE='-1')
    return env


class Supervisor:
    def __init__(self, root, env, diagnostic):
        self.root, self.env, self.log = root, env, diagnostic
        self.context = MODEL_CONTEXT
        self.jobs = Jobs(root, env, diagnostic, windows=True)
        self.warm = None
        self.last_warm = -300

    def warm_model(self):
        self.log.event('model', 'warm-start')
        try:
            result = request(18764, '/api/generate', {
                'model': self.env['WAVE_GATEWAY_MODEL'], 'keep_alive': -1, 'stream': False,
                'options': {'num_ctx': self.context, 'num_gpu': int(self.env.get('WAVE_OLLAMA_GPU_LAYERS', '999')),
                            'num_thread': 8, 'num_batch': 256, 'draft_num_predict': 0}}, timeout=180)
            self.log.event('model', 'warm-ready' if result.get('done') else 'warm-failed')
        except Exception:
            self.log.event('model', 'warm-failed')

    def tick(self):
        try:
            models = request(18764, '/api/ps').get('models')
            if not isinstance(models, list):
                raise ValueError('Invalid local response')
            matching = [m for m in models if m.get('name') == self.env['WAVE_GATEWAY_MODEL']]
            if matching:
                self.log.event('ollama', 'healthy')
                if any(m.get('context_length', self.context) != self.context for m in matching):
                    self.log.event('model', 'context-mismatch')  # Needs explicit idle maintenance, never unload.
            elif models:
                self.log.event('model', 'foreign-model')
            elif (self.warm is None or not self.warm.is_alive()) and time.monotonic() - self.last_warm >= 300:
                self.last_warm = time.monotonic()
                self.warm = threading.Thread(target=self.warm_model, daemon=True)
                self.warm.start()
        except Exception:
            if listening(18764):
                self.log.event('ollama', 'listener-busy')
            else:
                self.jobs.start('ollama', [str(self.root / 'ollama-0.34.2' / 'ollama.exe'), 'serve'])
        try:
            request(18765, '/v1/health', token=self.env['WAVE_GATEWAY_TOKEN'])
            self.log.event('gateway', 'healthy')
        except Exception:
            if listening(18765):
                self.log.event('gateway', 'listener-busy')
            else:
                self.jobs.start('gateway', [sys.executable, str(self.root / 'gateway.py')])


def main():
    root = Path(os.environ.get('WAVE_RUNTIME_ROOT') or Path(os.environ['LOCALAPPDATA']) / 'WAVE' / 'naru-runtime')
    log = Diagnostics(root / 'logs')
    lock = acquire_lock(root, windows=True)
    if lock is None:
        log.event('supervisor', 'already-running')
        return
    try:
        env = runtime_env(root)
    except Exception:
        log.event('supervisor', 'configuration-error')
        return
    ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
    try:
        supervisor = Supervisor(root, env, log)
        while True:
            supervisor.tick()
            time.sleep(15)
    finally:
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)
        lock.close()


if __name__ == '__main__':
    main()

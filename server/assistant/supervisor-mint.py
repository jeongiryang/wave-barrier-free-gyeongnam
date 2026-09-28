"""Headless LM Studio recovery; only the dedicated model may be loaded, never unloaded."""
import os
from pathlib import Path
import time
from supervisor_common import Diagnostics, Jobs, acquire_lock, listening, request, MODEL_CONTEXT

MODEL = 'gemma-4-26b-a4b-it'


class Supervisor:
    def __init__(self, root, diagnostic):
        self.root, self.log = root, diagnostic
        self.lms = str(Path.home() / '.lmstudio' / 'bin' / 'lms')
        self.jobs = Jobs(root, os.environ.copy(), diagnostic)
        self.context = MODEL_CONTEXT

    def tick(self):
        try:
            models = request(1234, '/api/v1/models').get('models')
            if not isinstance(models, list):
                raise ValueError('Invalid local response')
            instances = [instance for model in models for instance in model.get('loaded_instances', [])]
            if any(instance.get('id') == MODEL for instance in instances):
                self.log.event('mint', 'healthy')
            elif instances:
                self.log.event('model', 'foreign-model')
            else:
                self.jobs.start('model', [self.lms, 'load', MODEL, '--identifier', MODEL,
                                         '--gpu', 'max', '--context-length', str(self.context), '--parallel', '1', '--yes'])
            return
        except Exception:
            if listening(1234):
                self.log.event('mint', 'listener-busy')
                return
        # CLI tasks are asynchronous: a slow daemon or model operation is never
        # killed because of a watchdog deadline, nor queued a second time.
        daemon = self.jobs.children.get('daemon')
        server = self.jobs.children.get('server')
        if server is not None and server.poll() is None:
            return
        if (daemon is None or daemon.poll() not in (None, 0)
                or (daemon.poll() == 0 and self.jobs.attempts.get('server', -1)
                    >= self.jobs.attempts.get('daemon', 0))):
            self.jobs.start('daemon', [self.lms, 'daemon', 'up'])
        elif daemon.poll() == 0:
            self.jobs.start('server', [self.lms, 'server', 'start', '--port', '1234', '--bind', '127.0.0.1'])


def main():
    root = Path(os.environ.get('WAVE_RUNTIME_ROOT', str(Path.home() / 'wave-naru')))
    log = Diagnostics(root / 'logs')
    lock = acquire_lock(root)
    if lock is None:
        log.event('supervisor', 'already-running')
        return
    try:
        supervisor = Supervisor(root, log)
        while True:
            supervisor.tick()
            time.sleep(30)
    finally:
        lock.close()


if __name__ == '__main__':
    main()

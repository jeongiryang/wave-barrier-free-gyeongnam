"""Login-session recovery for the dedicated, already installed LM Studio model."""
import fcntl
import json
from pathlib import Path
import subprocess
import time
import urllib.request

ROOT = Path.home() / 'wave-naru'
LMS = str(Path.home() / '.lmstudio' / 'bin' / 'lms')
MODEL = 'gemma-4-26b-a4b-it'


def run(args):
    try:
        subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                       stderr=subprocess.DEVNULL, timeout=180, check=False)
    except (OSError, subprocess.TimeoutExpired):
        pass


def main():
    lock = open(ROOT / 'supervisor.lock', 'a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return
    while True:
        try:
            with urllib.request.urlopen('http://127.0.0.1:1234/api/v1/models', timeout=8) as response:
                models = json.load(response).get('models', [])
            if not any(instance.get('id') == MODEL for model in models
                       for instance in model.get('loaded_instances', [])):
                run([LMS, 'load', MODEL, '--identifier', MODEL, '--gpu', 'max',
                     '--context-length', '8192', '--parallel', '1', '--yes'])
        except Exception:
            run([LMS, 'server', 'start', '--port', '1234', '--bind', '127.0.0.1'])
        time.sleep(30)


if __name__ == '__main__':
    main()

"""Wait for the dedicated runtime, then load its model without a user prompt."""
import json
import os
import time
import urllib.request


def warm_model(open_url=urllib.request.urlopen, monotonic=time.monotonic,
               sleep=time.sleep, environment=None):
    env = os.environ if environment is None else environment
    base = env.get('WAVE_OLLAMA_URL', 'http://127.0.0.1:18764')
    deadline = monotonic() + 180
    startup_deadline = monotonic() + 30
    # Type=simple starts before Ollama binds its port. Retry only this cheap
    # readiness probe; never queue duplicate model-load requests.
    while True:
        remaining = startup_deadline - monotonic()
        if remaining <= 0:
            raise RuntimeError('Dedicated runtime did not become ready')
        try:
            with open_url(base + '/api/version', timeout=min(2, remaining)) as response:
                version = json.loads(response.read(4096)).get('version')
            if isinstance(version, str) and version:
                break
        except (OSError, ValueError, AttributeError):
            pass
        sleep(min(1, max(0, startup_deadline - monotonic())))

    payload = {
        'model': env.get('WAVE_GATEWAY_MODEL', 'gemma4:26b'),
        'stream': False, 'keep_alive': -1,
        'options': {'num_gpu': int(env.get('WAVE_OLLAMA_GPU_LAYERS', '0')),
                    'num_ctx': 8192, 'num_thread': 8, 'num_batch': 256,
                    'draft_num_predict': 0},
    }
    request = urllib.request.Request(base + '/api/generate',
        data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
    with open_url(request, timeout=max(1, deadline - monotonic())) as response:
        result = json.loads(response.read(65536))
    if not result.get('done'):
        raise RuntimeError('Model warmup incomplete')


if __name__ == '__main__':
    try:
        warm_model()
    except Exception:
        raise SystemExit('Dedicated model could not be prepared') from None
    print('Dedicated model ready')

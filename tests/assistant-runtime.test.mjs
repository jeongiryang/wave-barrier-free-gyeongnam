import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('dedicated AI runtime waits for startup and never repeats model loading', () => {
  const result = spawnSync(process.env.WAVE_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'),
    ['-I', '-B', fileURLToPath(new URL('../server/assistant/test-warm-model.py', import.meta.url))],
    { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
});

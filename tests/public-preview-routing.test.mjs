import test from 'node:test';
import assert from 'node:assert/strict';
import { publicPreviewReads } from '../scripts/vite-public-preview.mjs';

test('public preview leaves assistant health, inference, and authentication on the local backend', async () => {
  const previous = process.env.WAVE_PUBLIC_PREVIEW;
  process.env.WAVE_PUBLIC_PREVIEW = '1';
  let middleware;
  publicPreviewReads().configureServer({ middlewares: { use(fn) { middleware = fn; } } });
  try {
    for (const [method, url] of [['GET', '/api/assistant'], ['POST', '/api/assistant'], ['GET', '/api/auth/get-session'], ['POST', '/api/community/posts']]) {
      let continued = false;
      await middleware({ method, url }, {}, () => { continued = true; });
      assert.equal(continued, true, `${method} ${url} stays local`);
    }
  } finally {
    if (previous === undefined) delete process.env.WAVE_PUBLIC_PREVIEW;
    else process.env.WAVE_PUBLIC_PREVIEW = previous;
  }
});

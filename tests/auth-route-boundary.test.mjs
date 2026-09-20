import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { privateAuthResponse } from '../lib/auth/private-response.js';
import { profileUpdateBody } from '../lib/auth/profile.js';
import { verifySameOriginMutation } from '../lib/security/request-boundaries.js';

// Execute the exported application route, not only Better Auth's inner handler.
function fixture() {
  const calls = [];
  const handle = async request => {
    calls.push(new URL(request.url).pathname);
    return Response.json({ accepted: true });
  };
  const dependencies = {
    '../../../../lib/auth/server': { getAuth: () => ({ handler: () => ({ GET: handle, POST: handle, PATCH: handle }) }) },
    '../../../../lib/auth/private-response.js': { privateAuthResponse },
    '../../../../lib/server-request': { verifySameOriginMutation },
    '../../../../lib/auth/profile.js': { profileUpdateBody },
  };
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../app/api/auth/[...path]/route.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => { assert.ok(dependencies[name], name); return dependencies[name]; },
    process: { env: { WAVE_AUTH_BACKEND: 'native' } }, Response, Request, Headers, URL,
  });
  const request = (path, method = 'POST', origin = 'https://wave.example', body = '{}') => exports[method](
    new Request(`https://wave.example/api/auth${path}`, { method, headers: { origin, 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body }) }),
    { params: Promise.resolve({ path: path.slice(1).split('/') }) },
  );
  return { calls, request };
}

test('native application route admits username login alongside email, social and signup', async () => {
  const f = fixture();
  for (const path of ['/sign-in/username', '/sign-in/email', '/sign-in/social', '/sign-up/email']) {
    const result = await f.request(path);
    assert.equal(result.status, 200, path);
    assert.match(result.headers.get('cache-control'), /private, no-store/);
    assert.equal(f.calls.at(-1), `/api/auth${path}`);
  }
  assert.equal(f.calls.length, 4);
});

test('username route retains origin and size guards before the authentication handler', async () => {
  const f = fixture();
  assert.equal((await f.request('/sign-in/username', 'POST', 'https://attacker.example')).status, 403);
  assert.equal((await f.request('/sign-in/username', 'POST', 'https://wave.example', 'x'.repeat(65537))).status, 413);
  assert.equal(f.calls.length, 0);
});

test('native route still denies username mutations, token access, arbitrary routes and wrong methods', async () => {
  const f = fixture();
  for (const path of ['/sign-in/username/extra', '/sign-in/username-other', '/update-username', '/get-access-token', '/delete-user', '/admin/list-users']) {
    assert.equal((await f.request(path)).status, 404, path);
  }
  for (const method of ['GET', 'PATCH']) assert.equal((await f.request('/sign-in/username', method)).status, 404);
  assert.equal(f.calls.length, 0);
});

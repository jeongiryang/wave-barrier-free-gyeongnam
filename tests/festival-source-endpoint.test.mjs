import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as links from '../lib/festival-links.js';
import * as dates from '../lib/trip-dates.js';

function fixture(items = [], failed = false) {
  const calls = [], exports = {};
  const dependencies = {
    '../../lib/festival-links.js': links, '../../lib/trip-dates.js': dates,
    '../shared/http': { clean: value => String(value ?? ''), json: (value, status = 200) => Response.json(value, { status }) },
    '../shared/provider-data': {
      commonParams: () => ({}), attemptProvider: async promise => promise,
      fetchTourismData: async (...args) => { calls.push(args); return failed ? { ok: false } : { ok: true, value: { items } }; },
    },
    './accessibility-model': { placeFrom() { throw Error('Source lookup must not build a trip'); } },
    './catalog': { regionCodes: {}, profileFields: {} },
  };
  const source = ts.transpileModule(readFileSync(new URL('../server/tourism/festivals.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', source)(exports, name => { assert.ok(dependencies[name], name); return dependencies[name]; });
  return { calls, get: id => exports.handleFestivals(new Request(`https://wave.example/api/festivals?contentId=${encodeURIComponent(id)}`), {}) };
}

test('festival link lookup returns only the requested festival record', async () => {
  const f = fixture([
    { contentid: '1002', contenttypeid: '15', homepage: 'https://wrong.example' },
    { contentid: '1001', contenttypeid: '15', homepage: '<a href="https://festival.example">행사</a>', cotid: 'kto-record' },
  ]);
  const result = await f.get('1001');
  assert.equal(result.status, 200);
  assert.deepEqual(f.calls[0].slice(1, 4), ['KorService2', 'detailCommon2', { contentId: '1001' }]);
  const data = await result.json();
  assert.equal(data.websiteUrl, 'https://festival.example/');
  assert.match(data.officialUrl, /cotid=kto-record$/);
});

test('non-festival records, invalid identifiers and provider failures cannot fabricate a homepage', async () => {
  const f = fixture([{ contentid: '1001', contenttypeid: '12', homepage: 'https://place.example' }]);
  const absent = await (await f.get('1001')).json();
  assert.equal(absent.websiteUrl, ''); assert.equal(absent.officialUrl, '');
  const invalid = fixture(); assert.equal((await invalid.get('../other')).status, 400); assert.equal(invalid.calls.length, 0);
  const failed = await fixture([], true).get('1001'); assert.equal(failed.status, 502);
  assert.equal((await failed.json()).websiteUrl, undefined);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as budgets from '../lib/request-budget.js';
import * as calendar from '../lib/tourism/crowd-calendar.js';

const code = ts.transpileModule(readFileSync(new URL('../server/tourism/crowd-calendar.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const place = { contentid: '1001', title: '경남 미술관', lDongRegnCd: '48', lDongSignguCd: '121', mapx: '128.691', mapy: '35.238' };
const forecast = { tAtsNm: '경남 미술관', areaCd: '48', signguCd: '48121', baseYmd: '20260912', cnctrRate: '20' };
async function run({ id = '1001', common = [place], rows = [forecast], partialAt, errorAt, timeoutAt } = {}) {
  const mod = { exports: {} }, calls = [];
  new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
    if (name.endsWith('map-coordinates.js')) return coordinates;
    if (name.endsWith('request-budget.js')) return timeoutAt ? { ...budgets, SERVER_BUDGET_MS: { ...budgets.SERVER_BUDGET_MS, visitInfo: 8 } } : budgets;
    if (name.endsWith('crowd-calendar.js')) return calendar;
    if (name.endsWith('/date-utils')) return { todayYmd: () => '20260911' };
    if (name.endsWith('/catalog')) return { regionCodes: { 창원: { full: ['48121', '48123', '48125', '48127', '48129'] }, 진주: { full: ['48170'] } } };
    if (name.endsWith('/http')) return { json: (body, status = 200, cache = false) => ({ body, status, cache }), clean: (value, max = 240) => String(value ?? '').replace(/<[^>]*>/g, '').slice(0, max) };
    if (name.endsWith('/provider-data')) return {
      commonParams: numOfRows => ({ numOfRows }),
      fetchTourismData: async (...args) => { calls.push(args.slice(1, 4)); if (args[2] === timeoutAt) return new Promise(() => {}); return { items: args[2] === 'detailCommon2' ? common : rows, partial: args[2] === partialAt, failed: args[2] === errorAt }; },
      attemptProvider: async promise => { const value = await promise; return value.failed ? { ok: false } : { ok: true, value }; },
    };
    throw Error(name);
  });
  return { ...await mod.exports.handleCrowdCalendar(new URL(`https://wave.test/api/wave?action=crowd-calendar&contentId=${encodeURIComponent(id)}&region=서울&title=client-title&signguCd=11110&lat=37.5`), {}), calls };
}

test('calendar requests resolve title and exact district from the public ID, not client hints', async () => {
  const result = await run();
  assert.equal(result.status, 200); assert.equal(result.cache, true);
  assert.deepEqual(result.body.days, [{ date: '2026-09-12', rate: 20 }]);
  assert.equal(result.calls.length, 2);
  assert.deepEqual(result.calls[1], ['TatsCnctrRateService', 'tatsCnctrRatedList', { numOfRows: '100', areaCd: '48', signguCd: '48121', tAtsNm: '경남 미술관' }]);
  assert.doesNotMatch(JSON.stringify(result.calls), /37\.5|11110|client-title|profiles/);
  assert.deepEqual((await run({ common: [{ ...place, lDongSignguCd: '125' }], rows: [{ ...forecast, signguCd: '48125' }] })).body.days, [{ date: '2026-09-12', rate: 20 }]);
});
test('unverified regions, records or dates never become quieter suggestions', async () => {
  for (const common of [[{ ...place, lDongRegnCd: '11' }], [{ ...place, lDongSignguCd: '' }], [{ ...place, mapx: '' }]]) {
    const result = await run({ common }); assert.equal(result.calls.length, 1); assert.equal(result.body.status, 'location-unconfirmed'); assert.equal(result.cache, false);
  }
  for (const row of [{ ...forecast, areaCd: '11' }, { ...forecast, signguCd: '48170' }, { ...forecast, tAtsNm: '다른 미술관' }, { ...forecast, baseYmd: '20260910' }, { ...forecast, cnctrRate: '' }]) {
    const result = await run({ rows: [row] }); assert.deepEqual(result.body.days, []); assert.equal(result.cache, false);
  }
  assert.equal((await run({ id: '1001&x=y' })).status, 400);
  assert.equal((await run({ id: '1001&x=y' })).calls.length, 0);
  assert.equal((await run({ common: [{ ...place, contentid: '1002' }] })).status, 502);
});
test('provider failures, partial data and stalled requests retain failure boundaries', async () => {
  for (const operation of ['detailCommon2', 'tatsCnctrRatedList']) {
    for (const type of ['errorAt', 'partialAt', 'timeoutAt']) {
      const result = await run({ [type]: operation }); assert.equal(result.status, 502); assert.equal(result.cache, false);
    }
  }
});

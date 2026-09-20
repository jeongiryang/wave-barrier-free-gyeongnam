import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as schedule from '../features/planner/optimization/itinerary-schedule.js';
import * as hours from '../lib/visit-hours.js';
function load(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', code)(exports, name => { assert.ok(dependencies[name], name); return dependencies[name]; });
  return exports;
}
const records = new Map();
const { tripTimingWarnings } = load('../features/planner/trip-timing-review.ts', {
  './optimization/itinerary-schedule.js': schedule, './utils': load('../features/planner/utils.ts', {}),
  '../../lib/visit-hours.js': hours, './services/visit-info': { cachedVisitInfo: id => records.get(id) || null },
});
const input = { places: [{ id: '1001', name: '미술관' }], travelStart: '2026-10-14', travelEnd: '2026-10-14', dayStartTime: '08:00', routeMinutesByPlaceId: { '1001': 10 }, visitMinutesByPlaceId: { '1001': 30 } };
const info = { id: '1001', status: 'available', checkedAt: '2026-10-14T00:00:00Z', source: '한국관광공사', hours: '09:00~18:00', restDays: '연중무휴' };

test('published operating hours warn before opening and after closing using the actual schedule', () => {
  records.set('1001', info);
  assert.match(tripTimingWarnings(input).join(), /미술관: 개장 전 도착/);
  assert.match(tripTimingWarnings({ ...input, dayStartTime: '18:00' }).join(), /폐장 후 도착/);
  assert.deepEqual(tripTimingWarnings({ ...input, dayStartTime: '10:00' }), []);
});
test('ambiguous, missing, unavailable and wrong-place evidence never manufactures a warning', () => {
  for (const value of [null, { ...info, hours: '하절기 09:00~18:00 / 동절기 10:00~17:00' }, { ...info, status: 'empty' }, { ...info, source: '' }]) {
    records.set('1001', value); assert.deepEqual(tripTimingWarnings(input), []);
  }
  records.clear(); records.set('1002', info); assert.deepEqual(tripTimingWarnings(input), []);
});
test('last admission, closing during a visit and definite holiday reuse the existing hours assessment', () => {
  records.set('1001', { ...info, hours: '09:00~18:00 (입장마감 17:00)' });
  assert.match(tripTimingWarnings({ ...input, dayStartTime: '17:00' }).join(), /입장 마감 후 도착/);
  records.set('1001', info);
  assert.match(tripTimingWarnings({ ...input, dayStartTime: '17:30', visitMinutesByPlaceId: { '1001': 60 } }).join(), /방문 중 운영 종료/);
  records.set('1001', { ...info, restDays: '수요일' });
  assert.match(tripTimingWarnings({ ...input, dayStartTime: '10:00' }).join(), /등록된 휴무일/);
});
test('waiting for a fixed visit and post-visit breaks retain actual visit boundaries', () => {
  records.set('1001', info);
  assert.deepEqual(tripTimingWarnings({ ...input, fixedVisits: { '1001': { kind: 'visit', time: '10:00', position: 0 } } }), []);
  assert.deepEqual(tripTimingWarnings({ ...input, dayStartTime: '17:10', breakMinutesByPlaceId: { '1001': 120 } }), []);
});
test('cache reads never request data, expired evidence is excluded and requested evidence notifies subscribers', async () => {
  let calls = 0, notifications = 0;
  const cache = load('../features/planner/services/visit-info.ts', {
    '../../../lib/request-budget.js': { CLIENT_BUDGET_MS: { visitInfo: 1000 } },
    './api': { plannerJson: async () => { calls++; return info; } },
  });
  const realNow = Date.now; let now = realNow(); Date.now = () => now;
  try {
    const off = cache.subscribeVisitInfo(() => notifications++);
    assert.equal(cache.cachedVisitInfo('1001'), null); assert.equal(calls, 0);
    await cache.fetchVisitInfo('1001');
    assert.equal(cache.cachedVisitInfo('1001'), info); assert.equal(notifications, 1);
    await cache.fetchVisitInfo('1001'); assert.equal(calls, 1);
    now += 15 * 60 * 1000 + 1;
    assert.equal(cache.cachedVisitInfo('1001'), null); assert.equal(calls, 1);
    off(); await cache.fetchVisitInfo('1001'); assert.equal(calls, 2); assert.equal(notifications, 1);
  } finally { Date.now = realNow; }
});

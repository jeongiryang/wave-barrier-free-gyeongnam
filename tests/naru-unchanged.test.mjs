import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as actions from '../lib/assistant-actions.js';
import * as journey from '../lib/naru-journey.js';
import * as dates from '../lib/trip-dates.js';

const day = '2026-09-20';
const places = ['1001', '1002'].map(id => ({ id, name: `합성 실내 장소 ${id}`, city: '창원', contentTypeId: '14', mapX: '128.68', mapY: '35.23', source: '합성 공식 근거', accessibility: [] }));
const current = { region: '창원', start: day, end: day, transport: 'transit', profiles: ['wheel'], themes: ['history'], stops: places.map(place => ({ id: place.id, date: day, fixed: false })) };
const action = { action: 'adapt-itinerary', reason: 'rain', indoor: true };

function fixture({ sourceError = false, weatherError = false, missingIndoor = false, empty = false } = {}) {
  const dependencies = {
    '../shared/http': { clean: value => String(value || ''), json: value => Response.json(value) },
    '../../lib/assistant-actions.js': actions, '../../lib/naru-journey.js': journey, '../../lib/trip-dates.js': dates,
    '../tourism/plan-builder': { buildPlan: async () => ({ places: empty ? [] : places, statuses: [{ id: 'tour', state: sourceError ? 'error' : 'live' }] }) },
    '../tourism/festivals': { koreaToday: () => day, fetchFestivals: () => { throw new Error('unexpected festival lookup'); } },
    '../tourism/visit-info': { handleVisitInfo: async url => missingIndoor && url.searchParams.get('contentId') === '1002'
      ? Response.json({ status: 'provider-error' }, { status: 502 }) : Response.json({ setting: { state: 'indoor-space', detail: '합성 공식 실내 기록' } }) },
    '../weather/handler': { handleWeatherApi: async () => weatherError ? Response.json({}, { status: 503 }) : Response.json({ days: [{ date: day, label: '비', rainProbability: 80, rain: 4 }] }) },
    '../tourism/catalog': { profileFields: { wheel: [], baby: [] }, contentTypes: { history: '14' }, regionCodes: { '창원': {}, '진주': {} } },
    '../shared/provider-data': { fetchTourismData: () => { throw new Error('unexpected saved-place lookup'); } },
    '../tourism/accessibility-model': {}, '../../features/planner/services/plan-response': { planResponse: value => value },
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../server/assistant/planning.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { assert.ok(dependencies[name], name); return dependencies[name]; }, Request, Response, URL, URLSearchParams, AbortSignal, AbortController, TextEncoder, ReadableStream, Date });
  return (proposal = action, context = current) => exports.prepareJourney(proposal, context, new Request('https://wave.example/api/assistant/journey'), {}, () => {});
}

test('real journey orchestration marks already-indoor visits unchanged and does not suggest applying them', async () => {
  const before = JSON.stringify(current);
  const result = await fixture()();
  assert.equal(result.outcome.kind, 'unchanged');
  assert.equal(result.outcome.reason, 'already-indoor');
  assert.deepEqual(result.outcome.kept.map(stop => stop.id), ['1001', '1002']);
  assert.equal(result.stops.length, 0);
  assert.ok(result.warnings.some(text => text.includes('미확인 편의')));
  assert.ok(!result.warnings.some(text => /적용 후|대안이 없어요|더할 장소/.test(text)));
  assert.equal(JSON.stringify(current), before);
});

for (const failure of ['sourceError', 'weatherError', 'missingIndoor']) test(`${failure} cannot be relabelled as an already-indoor success`, async () => {
  const result = await fixture({ [failure]: true })();
  assert.equal(result.outcome.kind, 'unavailable');
  assert.equal(result.stops.length, 0);
});

test('new requests, empty trips and additional changes retain the unavailable result', async () => {
  assert.equal((await fixture()({ action: 'create-itinerary', indoor: true })).outcome.kind, 'unavailable');
  assert.equal((await fixture({ empty: true })(action, { ...current, stops: [] })).outcome.kind, 'unavailable');
  for (const patch of [{ transport: 'car' }, { profiles: ['baby'] }, { start: '2026-09-19', end: day }, { region: '진주' }]) {
    assert.equal((await fixture()({ ...action, ...patch })).outcome.kind, 'unavailable');
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as actions from '../lib/assistant-actions.js';
import * as journey from '../lib/naru-journey.js';
import * as dates from '../lib/trip-dates.js';
import { GYEONGNAM_REGION_POINTS } from '../lib/gyeongnam-regions.js';
import { groundAssistantProposal } from '../lib/assistant-grounding.js';

const day = '2026-09-20';
const prompt = '부모님이 오래 걷기 힘들어. 창원에서 출발해서 당일치기로 여행하고 싶어.';
const current = { today: '2026-09-13', days: [day], start: day, end: day, region: '', savedIds: [], stops: [], profiles: ['wheel'], transport: 'transit' };
const facilities = [['parking', '장애인 주차'], ['route', '접근로'], ['wheelchair', '휠체어 대여'], ['elevator', '엘리베이터'], ['restroom', '장애인 화장실']];

function fixture({ empty = false } = {}) {
  const calls = [];
  const dependencies = {
    '../shared/http': { clean: value => String(value || ''), json: value => Response.json(value) },
    '../../lib/assistant-actions.js': actions, '../../lib/naru-journey.js': journey, '../../lib/trip-dates.js': dates,
    '../tourism/plan-builder': { buildPlan: async request => {
      const url = new URL(request.url); calls.push(url);
      const region = url.searchParams.get('region'), point = GYEONGNAM_REGION_POINTS[region];
      const places = empty ? [] : ['1001', '1002', '1003'].map((id, index) => ({ id, name: `합성 ${region} 장소 ${id}`, city: region, source: '합성 관광 fixture', checkedAt: '2026-09-13T00:00:00Z',
        contentTypeId: '14', mapX: String(point.lng + index * 0.001), mapY: String(point.lat), knownFields: 0, unknownFields: 5,
        accessibility: facilities.map(([key, label]) => ({ key, label, state: index === 2 && key === 'route' ? 'negative' : 'unknown', detail: '' })) }));
      return { places: [], explorationPlaces: places, statuses: [{ id: 'barrierfree', state: 'error' }] };
    } },
    '../tourism/festivals': { koreaToday: () => day, fetchFestivals: () => { throw new Error('unexpected festival request'); } },
    '../tourism/visit-info': { handleVisitInfo: async () => Response.json({ setting: { state: 'indoor-space', detail: '합성 실내 근거' } }) },
    '../weather/handler': { handleWeatherApi: async () => Response.json({ days: [{ date: day, label: '합성 날씨', rainProbability: 0, rain: 0 }] }) },
    '../tourism/catalog': { profileFields: { wheel: facilities, senior: facilities.slice(1) }, contentTypes: { nature: '12', history: '14' }, regionCodes: Object.fromEntries(Object.keys(GYEONGNAM_REGION_POINTS).map(region => [region, {}])) },
    '../shared/provider-data': { fetchTourismData: () => { throw new Error('unexpected saved-place lookup'); } },
    '../tourism/accessibility-model': {},
    '../../features/planner/services/plan-response': { planResponse: value => value },
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../server/assistant/planning.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { assert.ok(dependencies[name], name); return dependencies[name]; }, Request, Response, URL, URLSearchParams, AbortSignal, AbortController, TextEncoder, ReadableStream, Date });
  return { calls, prepare: (action, context = current) => exports.prepareJourney(action, context, new Request('https://wave.example/api/assistant/journey'), {}, () => {}) };
}

test('grounded local search reaches journey preparation while transport and unconfirmed facilities stay honest', async () => {
  const f = fixture(), before = JSON.stringify(current);
  const action = groundAssistantProposal({ action: 'create-itinerary', originRegion: '창원', region: '양산', transport: 'car' }, [{ role: 'user', content: prompt }], current);
  const result = await f.prepare(action);
  assert.deepEqual(f.calls.map(url => url.searchParams.get('region')), ['창원']);
  assert.equal(result.region, '창원'); assert.equal(result.originRegion, '창원'); assert.equal(result.transport, 'transit');
  assert.deepEqual([...result.profiles], ['wheel', 'senior']);
  assert.equal(result.start, day); assert.equal(result.end, day);
  assert.deepEqual(result.stops.map(stop => stop.place.id), ['1001', '1002']);
  assert.ok(result.stops.every(stop => stop.date === day && stop.breakMinutes === 20 && stop.unknown.length === 5));
  assert.ok(result.warnings.some(warning => warning.includes('실제 이동시간과 통행 편의는 적용 후 경로에서 확인')));
  assert.equal(JSON.stringify(current), before);
});

test('empty nearby evidence does not silently widen the search or release the requested facilities', async () => {
  const f = fixture({ empty: true });
  const action = groundAssistantProposal({ action: 'create-itinerary', originRegion: '창원' }, [{ role: 'user', content: prompt }], current);
  const result = await f.prepare(action);
  assert.deepEqual(f.calls.map(url => [url.searchParams.get('region'), url.searchParams.get('profiles')]), [['창원', 'wheel,senior']]);
  assert.equal(result.stops.length, 0); assert.equal(result.transport, 'transit');
  assert.ok(result.warnings.some(warning => warning.includes('필요한 편의는 유지하고')));
});

test('explicit Jinju remains the journey search destination despite a Changwon day-trip departure', async () => {
  const f = fixture();
  const action = groundAssistantProposal({ action: 'create-itinerary', region: '진주', originRegion: '창원' }, [{ role: 'user', content: prompt.replace('당일치기로', '진주로 당일치기') }], current);
  const result = await f.prepare(action);
  assert.deepEqual(f.calls.map(url => url.searchParams.get('region')), ['진주']);
  assert.equal(result.region, '진주'); assert.equal(result.originRegion, '창원');
});

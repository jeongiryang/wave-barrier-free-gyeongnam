import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as budgets from '../lib/request-budget.js';
import * as facilities from '../lib/facility-selection.js';
import * as score from '../lib/accessibility-score.js';
import {
  DINING_EVIDENCE_NOTE, DINING_GROUPS, DINING_TAG_LIMIT, dedupeNearbyDining, diningDistanceText,
  diningFacilityTagText, diningFacilityTags, normalizeDiningName, roundDiningDistance, splitDiningGroups,
} from '../lib/dining-accessibility.js';

// 스펙 08: 음식점 목록 위에 확인된 편의 정보를 겹쳐 보여준다. 개별 음식점의
// 후기 수·별점·조회수를 주는 공식 제공처가 없으므로 그런 값을 만들지 않고,
// 타입에 자리도 두지 않는다. 미확인을 없음으로 바꾸지 않는다.

const root = fileURLToPath(new URL('../', import.meta.url));
const clean = (value, max = 240) => String(value ?? '').replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

function loadServer({ calls, responses, budgetMs }) {
  const cache = new Map();
  const load = (name) => {
    let file = resolve(root, name);
    if (!existsSync(file)) file += '.ts';
    if (file.endsWith('map-coordinates.js')) return coordinates;
    if (file.endsWith('facility-selection.js')) return facilities;
    if (file.endsWith('accessibility-score.js')) return score;
    if (file.endsWith('request-budget.js')) return budgetMs ? { ...budgets, SERVER_BUDGET_MS: { ...budgets.SERVER_BUDGET_MS, diningAccessibility: budgetMs } } : budgets;
    if (file.endsWith('shared\\http.ts') || file.endsWith('shared/http.ts')) {
      return { clean, httpsUrl: (value) => String(value ?? ''), json: (body, status = 200, cached = false) => ({ body, status, cached }) };
    }
    if (file.endsWith('provider-data.ts')) {
      return {
        commonParams: (rows = '12') => ({ numOfRows: rows }),
        fetchTourismData: async (_env, service, operation, params) => {
          calls.push({ service, operation, params });
          const reply = responses(service, operation, params);
          if (reply === 'hang') return new Promise(() => {});
          if (reply instanceof Error) throw reply;
          return reply;
        },
        attemptProvider: async (promise) => { try { return { ok: true, value: await promise }; } catch (error) { return { ok: false, error: String(error.message) }; } },
      };
    }
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('module', 'exports', 'require', code)(mod, mod.exports, (specifier) => {
      if (!specifier.startsWith('.')) throw Error('Unexpected external dependency: ' + specifier);
      return load(resolve(dirname(file), specifier));
    });
    return mod.exports;
  };
  return load('server/tourism/dining-accessibility.ts');
}

const destination = { contentid: '1001', title: '여행지', lDongRegnCd: '48', lDongSignguCd: '121', mapx: '128.6800', mapy: '35.2300' };
const restaurant = (id, name, x, y) => ({ contentid: id, title: name, addr1: '경상남도 창원시', mapx: x, mapy: y, contenttypeid: '39' });

function harness(options = {}) {
  const calls = [];
  const {
    commonItems = [destination],
    listItems = [restaurant('2001', '가까운 국숫집', '128.6810', '35.2300'), restaurant('2002', '먼 해물탕', '128.7000', '35.2400')],
    withTour = { contentid: '2001', route: '주출입구에 경사로가 있습니다', restroom: '없음' },
    intro = { contentid: '2001', opentimefood: '11:00~21:00', infocenterfood: '055-000-0000' },
    failAt, hangAt, budgetMs,
  } = options;
  const responses = (service, operation) => {
    if (operation === hangAt) return 'hang';
    if (operation === failAt) return new Error('synthetic provider failure');
    if (operation === 'detailCommon2') return { items: commonItems, total: commonItems.length };
    if (operation === 'areaBasedList2') return { items: listItems, total: listItems.length };
    if (operation === 'detailWithTour2') return { items: withTour ? [withTour] : [], total: withTour ? 1 : 0 };
    return { items: intro ? [intro] : [], total: intro ? 1 : 0 };
  };
  const mod = loadServer({ calls, responses, budgetMs });
  return { calls, run: (query = 'contentId=1001') => mod.handleDiningAccessibility(new URL('https://wave.test/api/wave?action=dining-accessibility&' + query), {}) };
}

test('facility tags stop at three and fold the rest into a +N count', () => {
  const list = ['route', 'elevator', 'restroom', 'parking', 'wheelchair'].map((key) => ({ key, label: facilities.facilityLabel(key), state: 'confirmed' }));
  const tags = diningFacilityTags(list);
  assert.equal(DINING_TAG_LIMIT, 3);
  assert.equal(tags.shown.length, 3);
  assert.equal(tags.hidden, 2);
  assert.equal(diningFacilityTags([]).hidden, 0);
  assert.equal(diningFacilityTags(list.slice(0, 2)).hidden, 0);
});

test('requested facilities come first, then confirmed, and a chosen condition is never dropped', () => {
  const list = [
    { key: 'route', label: '접근로', state: 'unknown' },
    { key: 'elevator', label: '승강기', state: 'confirmed' },
    { key: 'restroom', label: '장애인 화장실', state: 'negative' },
    { key: 'parking', label: '장애인 주차구역', state: 'confirmed' },
  ];
  // 사용자가 고른 조건(route)이 미확인이어도 목록에서 빠지지 않는다.
  const requested = diningFacilityTags(list, ['route']);
  assert.deepEqual(requested.shown.map((item) => item.key), ['route', 'elevator', 'parking']);
  const none = diningFacilityTags(list, []);
  assert.deepEqual(none.shown.map((item) => item.key), ['elevator', 'parking', 'restroom']);
});

test('the three states are told apart in words, and unknown is never written as absent', () => {
  assert.equal(diningFacilityTagText({ label: '접근로', state: 'confirmed' }), '접근로');
  assert.equal(diningFacilityTagText({ label: '접근로', state: 'negative' }), '접근로 없음');
  assert.equal(diningFacilityTagText({ label: '접근로', state: 'unknown' }), '접근로 정보 없음');
  assert.notEqual(diningFacilityTagText({ label: '접근로', state: 'unknown' }), diningFacilityTagText({ label: '접근로', state: 'negative' }));
  assert.match(DINING_EVIDENCE_NOTE, /정보가 없다고 해서 시설이 없는 것은 아니에요/);
});

test('facility states match accessibilityFieldState exactly; no dining-only scoring is introduced', () => {
  for (const [value, expected] of [['주출입구에 경사로가 있습니다', 'confirmed'], ['없음', 'negative'], ['', 'unknown'], ['정보 없음', 'unknown'], ['미제공', 'unknown']]) {
    assert.equal(score.accessibilityFieldState(value), expected);
  }
  const source = readFileSync(new URL('../server/tourism/dining-accessibility.ts', import.meta.url), 'utf8');
  assert.match(source, /placeFrom/);
  assert.doesNotMatch(source, /calculateAccessibilityEvidence|diningScore|popularity/i);
});

test('distances round from the destination coordinates and always say what they are measured from', () => {
  assert.equal(roundDiningDistance(347), 350);
  assert.equal(roundDiningDistance(1_249), 1_200);
  assert.equal(roundDiningDistance(-1), null);
  assert.equal(roundDiningDistance('nope'), null);
  assert.equal(diningDistanceText(347), '여행지에서 약 350m');
  assert.equal(diningDistanceText(1_249), '여행지에서 약 1.2km');
  assert.match(diningDistanceText(undefined), /여행지 기준/);
});

test('a duplicate is removed only when the normalised name and the distance both match', () => {
  const official = [{ name: '가까운 국숫집', distanceMeters: 320 }];
  const same = { name: '가까운  국숫집!', distanceMeters: 350 };
  const sameNameFarAway = { name: '가까운 국숫집', distanceMeters: 900 };
  const otherNameSameSpot = { name: '다른 국숫집', distanceMeters: 320 };
  assert.deepEqual(dedupeNearbyDining(official, [same]), []);
  assert.deepEqual(dedupeNearbyDining(official, [sameNameFarAway]), [sameNameFarAway]);
  assert.deepEqual(dedupeNearbyDining(official, [otherNameSameSpot]), [otherNameSameSpot]);
  assert.equal(normalizeDiningName('가까운  국숫집!'), normalizeDiningName('가까운 국숫집'));
  assert.equal(normalizeDiningName(null), '');
});

test('the two bundles stay separate and each carries its own evidence line', () => {
  const groups = splitDiningGroups([{ evidence: 'official', id: 'a' }, { evidence: 'place-search', id: 'b' }]);
  assert.deepEqual(groups.official.map((item) => item.id), ['a']);
  assert.deepEqual(groups.placeSearch.map((item) => item.id), ['b']);
  assert.match(DINING_GROUPS.official.title, /편의 정보가 확인된 음식점/);
  assert.match(DINING_GROUPS.official.evidence, /한국관광공사/);
  assert.match(DINING_GROUPS.placeSearch.title, /주변 음식점/);
  assert.match(DINING_GROUPS.placeSearch.evidence, /카카오 장소 검색/);
});

test('no rating, review count, view count, rank or user-coordinate field exists anywhere in the feature', () => {
  // 주석은 "별점을 보여주지 않는다"처럼 금지 낱말을 설명으로 담으므로, 코드만 본다.
  const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const sources = ['server/tourism/dining-accessibility.ts', 'lib/dining-accessibility.js', 'lib/dining-accessibility.d.ts', 'features/planner/components/DiningAccessibilityList.tsx']
    .map((name) => stripComments(readFileSync(new URL('../' + name, import.meta.url), 'utf8')));
  const types = readFileSync(new URL('../features/planner/types.ts', import.meta.url), 'utf8');
  const dining = stripComments(types.slice(types.indexOf('export type DiningEvidence')));
  for (const source of [...sources, dining]) {
    assert.doesNotMatch(source, /rating|reviewCount|reviewTotal|viewCount|visitCount|popularRank|ranking|starScore|별점|후기\s*수|조회수|순위|인기/);
    assert.doesNotMatch(source, /userLat|userLng|userLatitude|userLongitude|currentPosition|geolocation|sLat|sLng/);
  }
  assert.match(dining, /destination: \{ latitude: number; longitude: number \}/);
});

test('the server accepts a public content id only and never fans out for a malformed one', async () => {
  for (const query of ['contentId=', 'contentId=0', 'contentId=abc', 'contentId=1234567890123']) {
    const run = harness();
    const response = await run.run(query);
    assert.equal(response.status, 400);
    assert.equal(response.body.status, 'invalid-request');
    assert.equal(run.calls.length, 0);
  }
});

test('a request carries only the public content id; coordinates never leave the browser', async () => {
  const run = harness();
  const response = await run.run('contentId=1001&gpsLati=37.5&gpsLong=127.5&userId=private');
  assert.equal(response.body.status, 'available');
  assert.doesNotMatch(JSON.stringify(run.calls), /37\.5|127\.5|private|serviceKey/);
  assert.equal(run.calls[0].operation, 'detailCommon2');
  assert.equal(run.calls[1].operation, 'areaBasedList2');
  assert.equal(run.calls[1].params.contentTypeId, '39');
});

test('an unconfirmed or non-Gyeongnam destination stops before any restaurant lookup', async () => {
  for (const place of [{ ...destination, lDongRegnCd: '11' }, { ...destination, mapx: '139.7' }, { ...destination, contentid: '9999' }]) {
    const run = harness({ commonItems: [place] });
    const response = await run.run();
    assert.equal(response.body.status, 'location-unconfirmed');
    assert.equal(run.calls.length, 1);
  }
});

test('an empty list says so without claiming that no restaurant exists', async () => {
  const response = await harness({ listItems: [] }).run();
  assert.equal(response.body.status, 'empty');
  assert.equal(response.body.message, '등록된 음식점 정보가 없어요.');
  assert.doesNotMatch(response.body.message, /없습니다|식당이 없/);
});

test('a failed facility check leaves the list standing with unknown, never with absent', async () => {
  const response = await harness({ failAt: 'detailWithTour2' }).run();
  assert.equal(response.body.status, 'available');
  assert.equal(response.body.items.length, 2);
  assert.ok(response.body.items[0].facilities.length > 0);
  assert.ok(response.body.items[0].facilities.every((item) => item.state === 'unknown'));
  assert.equal(response.cached, false);
});

test('a facility check that runs out of budget stays unknown and does not fail the whole list', async () => {
  const run = harness({ hangAt: 'detailWithTour2', budgetMs: 40 });
  const response = await run.run();
  assert.equal(response.body.status, 'available');
  assert.ok(response.body.items.every((item) => item.facilities.every((field) => field.state === 'unknown')));
  assert.equal(response.cached, false);
});

test('the server normalises at most ten restaurants, nearest first, and never the destination itself', async () => {
  const many = Array.from({ length: 14 }, (_, index) => restaurant(String(3000 + index), `식당 ${index}`, String(128.68 + (14 - index) / 1000), '35.2300'));
  const run = harness({ listItems: [...many, { ...destination, contentid: '1001' }] });
  const response = await run.run();
  assert.equal(response.body.items.length, 10);
  assert.ok(response.body.items.every((item) => item.id !== '1001'));
  const distances = response.body.items.map((item) => item.distanceMeters);
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
});

test('only a complete result is cached, and the cache never stores a failed or partial one', async () => {
  const good = harness();
  await good.run();
  const calls = good.calls.length;
  await good.run();
  assert.equal(good.calls.length, calls, 'a complete result is served from the bounded cache');
  const failed = harness({ failAt: 'detailWithTour2' });
  await failed.run();
  const failedCalls = failed.calls.length;
  await failed.run();
  assert.ok(failed.calls.length > failedCalls, 'a failed facility check is not cached');
});

test('a destination lookup failure is reported without leaking the provider error text', async () => {
  const response = await harness({ failAt: 'detailCommon2' }).run();
  assert.equal(response.status, 502);
  assert.equal(response.body.message, '음식점 정보를 받지 못했어요.');
  assert.doesNotMatch(JSON.stringify(response.body), /synthetic provider failure/);
});

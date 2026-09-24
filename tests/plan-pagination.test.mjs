import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as criteria from '../lib/planner-criteria.js';
import * as facilities from '../lib/facility-selection.js';
import * as budgets from '../lib/request-budget.js';
const http = { clean: (value, length = 1000) => String(value || '').slice(0, length) };
function compile(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', code)(exports, name => { assert.ok(name in dependencies, name); return dependencies[name]; });
  return exports;
}
const catalog = compile('server/tourism/catalog.ts', { '../../lib/facility-selection.js': facilities });
const commonParams = rows => ({ numOfRows: rows, pageNo: '1' });
const query = compile('server/tourism/plan-query.ts', { '../shared/http': http, '../../lib/facility-selection.js': facilities, '../../lib/planner-criteria.js': criteria, '../shared/provider-data': { commonParams }, './catalog': catalog });
const providerModel = compile('server/tourism/provider-model.ts', { '../shared/http': http });
const empty = () => ({ ok: true, value: { items: [], total: 0 } });
function fixture(duplicate = false) {
  const calls = [], expected = new Set();
  const build = compile('server/tourism/plan-builder.ts', {
    '../shared/http': http,
    '../shared/provider-data': {
      commonParams, attemptProvider: async promise => ({ ok: true, value: await promise }),
      combineProviderResults: items => ({ items, total: items.length }), combineFailedProviderAttempts: () => ({ ok: false }),
      fetchRegionalList: async (_env, service, _operation, params, districts) => {
        calls.push({ service, ...params, districts });
        const items = [];
        if (params.pageNo === '1') for (const district of districts) for (let i = 0; i < 12; i++) {
          const prefix = duplicate ? '1' : service === 'KorWithService2' ? '1' : '2';
          const contentid = `${prefix}${params.contentTypeId}${district}${i.toString().padStart(2, '0')}`;
          items.push({ contentid, title: contentid }); expected.add(contentid);
        }
        return { ok: true, value: { items, total: items.length } };
      },
      fetchTourismData: async () => ({ items: [], total: 0 }),
    },
    './insights': { fetchCrowd: async () => empty(), fetchHub: async () => ({ result: empty(), baseYm: '' }), fetchRelated: async () => ({ result: empty(), baseYm: '' }) },
    './accessibility-model': { placeFrom: item => ({ id: item.contentid, name: item.title, image: '' }), requestedAccessibilityFields: keys => keys.map(key => [key, key]) },
    './content-model': { audioFrom: () => null, courseFrom: () => null },
    './plan-model': { sortPlacesByEvidence: items => items, partitionPlacesByEvidence: recommended => ({ recommended, exploration: [], unavailable: [] }), buildPlanStops: () => [], buildPlanStatuses: () => ({ statuses: [], mode: 'live' }) },
    './plan-query': query, './provider-model': providerModel, './photos': { fetchPhoto: async () => empty(), photoFrom: () => null },
    '../shared/observability': { recordOperationalEvent() {} }, '../../lib/request-budget.js': budgets, '../../lib/planner-criteria.js': criteria, './catalog': catalog,
  }).buildPlan;
  return { calls, expected, build };
}
for (const duplicate of [false, true]) test(`all districts and activity pages remain reachable across More, duplicate sources=${duplicate}`, async () => {
  const f = fixture(duplicate), seen = [], pages = [];
  let page = 1;
  do {
    pages.push(page);
    const response = await f.build(new Request(`https://wave.example/api/wave?region=${encodeURIComponent('창원')}&themes=nature,history&facilityKeys=restroom&page=${page}`), {});
    assert.ok(response.places.length <= 10, 'per-page facility lookups and rendered results stay bounded');
    assert.deepEqual(response.criteria.profiles, ['restroom'], 'load-more cannot relax required facilities');
    seen.push(...response.places.map(place => place.id));
    if (!response.pagination.hasMore) break;
    assert.ok(response.pagination.nextPage > page);
    page = response.pagination.nextPage;
    assert.ok(pages.length < 50);
  } while (true);
  assert.equal(new Set(seen).size, seen.length, 'duplicate source records are not displayed twice');
  assert.deepEqual(new Set(seen), f.expected, 'advancing the provider must not discard remaining returned records');
  assert.equal(seen.length, duplicate ? 120 : 240);
  assert.equal(pages.at(-1), 25, 'skip unused subpages only after every candidate in the batch was shown');
  assert.ok(f.calls.every(call => call.pageNo === '1' || call.pageNo === '2'));
});

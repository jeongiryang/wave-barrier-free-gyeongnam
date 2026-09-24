import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('exports', 'require', code)(exports, name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  });
  return exports;
}
const http = load('../server/shared/http.ts', { '../../lib/http-cache.js': {}, '../../lib/security/request-boundaries.js': {} });
const catalog = load('../server/tourism/catalog.ts', { '../../lib/facility-selection.js': { FACILITIES: [] } });
const success = items => ({ items, total: items.length });
function statistics(provider) {
  return load('../server/tourism/visitor-demand.ts', {
    '../shared/http': http, './catalog': catalog, './date-utils': { previousMonth: offset => `2026${String(10 - offset).padStart(2, '0')}` },
    '../shared/provider-data': {
      commonParams: numOfRows => ({ numOfRows }), fetchTourismData: provider,
      attemptProvider: async promise => { try { return { ok: true, value: await promise }; } catch (error) { return { ok: false, error: String(error) }; } },
    },
  });
}

test('nationwide-only visitor responses cannot become Gyeongnam figures after every fallback window', async () => {
  for (const region of ['경남 전체', '창원']) {
    const calls = [];
    const api = statistics(async (...args) => { calls.push(args); return success([{ signguCode: '11110', signguNm: '종로구', touNum: '900000' }]); });
    const pack = await api.fetchVisitorInsight({}, region);
    assert.equal(calls.length, 5);
    assert.equal(pack.result.ok, true);
    assert.deepEqual(pack.result.value, success([]));
    assert.equal(pack.startYmd, ''); assert.equal(pack.endYmd, '');
  }
});

test('visitor regional matches exclude namesakes outside Gyeongnam and preserve only actual matching rows', async () => {
  const rows = [
    { signguCode: '51820', signguNm: '고성군', touNum: '99000' },
    { signguCode: '48820', signguNm: '고성군', touNum: '120' },
    { signguCd: '48170', signguNm: '진주시', touNum: '340' },
    { signguNm: '고성군', touNum: '88000' },
    { signguNm: '경상남도 고성군', touNum: '50' },
    { signguCode: '51820', signguNm: '경상남도 고성군', touNum: '77000' },
  ];
  const api = statistics(async () => success(rows));
  const local = await api.fetchVisitorInsight({}, '고성');
  assert.deepEqual(local.result.value.items, [rows[1], rows[4]]);
  const province = await api.fetchVisitorInsight({}, '경남 전체');
  assert.deepEqual(province.result.value.items, [rows[1], rows[2], rows[4]]);
  assert.match(local.startYmd, /^\d{8}$/); assert.match(local.endYmd, /^\d{8}$/);
  const unavailable = await statistics(async () => { throw Error('provider timeout'); }).fetchVisitorInsight({}, '고성');
  assert.equal(unavailable.result.ok, false);
});

test('demand query scope distinguishes one Changwon district from province-wide data and retains the actual reference month', async () => {
  for (const [region, expectedScope, district] of [['창원', '창원시 의창구', '48121'], ['경남 전체', '경상남도', undefined], ['진주', '진주', '48170']]) {
    const calls = [];
    const api = statistics(async (...args) => { calls.push(args); return success([{ tarSvcDemIxNm: '관광', tarSvcDemIxVal: '74.8', baseYm: '202608' }]); });
    const pack = await api.fetchDemandInsight({}, region);
    assert.equal(pack.scope, expectedScope); assert.equal(pack.baseYm, '202608');
    assert.equal(calls.length, 1); assert.equal(calls[0][3].areaCd, '48');
    assert.equal(calls[0][3].signguCd, district); assert.equal(calls[0][3].tarSvcDemIxCd, '11');
  }
});

test('rendered demand figures disclose month and region, and missing visitor data never renders a zero-visit claim', () => {
  const jsx = (type, props) => ({ type, props });
  const text = node => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join(' ') : typeof node === 'object' ? text(node.props?.children) : String(node);
  for (const locale of ['ko', 'en']) {
    const Component = load('../features/planner/components/RegionalInsights.tsx', {
      'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
      '../../../components/SitePreferences': { useSitePreferences: () => ({ locale }) },
      '../place-copy': { originalLanguage: () => 'ko' },
    }).default;
    const rendered = text(Component({ enrichment: { visitor: { total: 0, startYmd: '', endYmd: '' }, statuses: [], demand: [{ name: '관광', value: 74.8, baseYm: '202607', scope: '창원시 의창구' }] }, loading: false, visitorTypes: [], demandMax: 100 }));
    assert.match(rendered, /2026-07/); assert.match(rendered, /창원시 의창구/); assert.match(rendered, /74\.8/);
    assert.match(rendered, locale === 'ko' ? /기준월/ : /Reference month/);
    assert.match(rendered, locale === 'ko' ? /74\.8\s+지수/ : /74\.8\s+index/);
    assert.match(rendered, locale === 'ko' ? /0명이라는 뜻이 아닙니다/ : /do not mean zero visits/);
  }
});

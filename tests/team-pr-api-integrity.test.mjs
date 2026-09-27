import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as experience from '../lib/experience.js';
import * as coordinates from '../lib/map-coordinates.js';
import * as distance from '../lib/device-location.js';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function stateHarness(runEffects = false) {
  const states = [], refs = [], effects = [];
  let index = 0, refIndex = 0, effectIndex = 0, pending = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => { const i = index++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => refs[refIndex++] ||= { current: initial },
    useCallback: value => value,
    useMemo: value => value(),
    useEffect: (callback, deps) => { const i = effectIndex++; if (runEffects && (!effects[i] || deps.some((value, j) => value !== effects[i].deps[j]))) pending.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: callback() }; }); },
  };
  return { react, render: fn => { index = refIndex = effectIndex = 0; pending = []; const result = fn(); pending.forEach(fn => fn()); return result; }, cleanup: () => effects.forEach(effect => effect.cleanup?.()) };
}
function load(path, deps, globals = {}, transform = code => code) {
  const code = ts.transpileModule(transform(source(path)), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', ...Object.keys(globals), code)(mod, mod.exports, name => { if (name in deps) return deps[name]; throw new Error(`Unexpected import ${name}`); }, ...Object.values(globals));
  return mod.exports;
}
function all(node) { return Array.isArray(node) ? node.flatMap(all) : node && typeof node === 'object' ? [node, ...all(node.props?.children)] : []; }
function text(node) { return Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node); }
function sensoryFixture(places, dev = true) {
  const hooks = stateHarness(), calls = [];
  const component = load('../features/planner/components/SensoryMap.tsx', {
    react: hooks.react, '../../../components/NightIcon': { default: 'NightIcon' }, '../../../components/WaveSelect': { default: 'WaveSelect' }, 'next/link': { default: 'Link' },
    '../../../lib/experience.js': experience, '../../../lib/map-coordinates.js': coordinates, '../../../lib/device-location.js': distance,
    '../services/api': { plannerJson: async (url, options) => { calls.push({ url, options }); return {}; } },
    './PlaceAudioGuide': { default: 'PlaceAudioGuide' }, './TravelExperience.module.css': { default: {} }, '../../../lib/evidence-cycle.js': { buildEvidenceReviewQueue: () => [] },
  }, { __env: { DEV: dev }, React: hooks.react, navigator: { geolocation: { getCurrentPosition: success => success({ coords: { latitude: 35.05, longitude: 128.1 } }) } } }, code => code.replaceAll('import.meta.env', '__env')).default;
  let tree;
  const render = () => { tree = hooks.render(() => component({ places })); };
  render();
  return { render, calls, get tree() { return tree; }, find: predicate => { const result = all(tree).find(predicate); assert.ok(result, 'expected control exists'); return result; } };
}
const place = (id, mapX = '', mapY = '') => ({ id, name: `Place ${id}`, mapX, mapY, source: '로컬 예시 데이터 · 실제 관광정보 아님', accessibility: [] });
test('arbitrary display pins cannot be selected as GPS-nearest real places', () => {
  const app = sensoryFixture([place('1001'), place('1002', '128.2', '35.1')]);
  assert.ok(app.find(n => n.type === 'g' && n.props['aria-label'] === 'Place 1001 시연용 임의 위치'));
  app.find(n => n.type === 'button' && text(n) === '내 근처 일정 장소 찾기').props.onClick(); app.render();
  assert.match(text(app.tree), /Place 1002 · 직선거리 약/);
  assert.doesNotMatch(text(app.tree), /Place 1001 · 직선거리 약/);
});
test('all arbitrary pins keep the no-confirmed-coordinate GPS result', () => {
  const app = sensoryFixture([place('1001'), place('1002')]);
  app.find(n => n.type === 'button' && text(n) === '내 근처 일정 장소 찾기').props.onClick(); app.render();
  assert.match(text(app.tree), /좌표를 확인한 일정 장소가 없어요/);
});
for (const method of ['click', 'Enter', ' ']) test(`map pin ${JSON.stringify(method)} clears the previous place observation draft`, async () => {
  const app = sensoryFixture([place('1001'), place('1002')]);
  const label = app.find(n => n.type === 'label' && text(n).startsWith('휠체어 이동'));
  all(label).find(n => n.type === 'WaveSelect').props.onChange({ target: { value: 'clear' } }); app.render();
  const share = () => app.find(n => n.type === 'button' && n.props.title === '현장 정보 공유');
  assert.equal(share().props.disabled, false);
  const pin = app.find(n => n.type === 'g' && n.props['aria-label'] === 'Place 1002 시연용 임의 위치');
  if (method === 'click') pin.props.onClick(); else pin.props.onKeyDown({ key: method, preventDefault() {} });
  app.render();
  assert.equal(share().props.disabled, true, 'A draft must not be submit-enabled for B');
  const nextLabel = app.find(n => n.type === 'label' && text(n).startsWith('휠체어 이동'));
  all(nextLabel).find(n => n.type === 'WaveSelect').props.onChange({ target: { value: 'blocked' } }); app.render();
  share().props.onClick(); await tick();
  assert.equal(app.calls.length, 1);
  assert.equal(app.calls[0].options.body.placeId, '1002');
  assert.deepEqual(app.calls[0].options.body.readings, { mobility: 'blocked' });
});

function planFixture(dev = true, localExamples) {
  const hooks = stateHarness(true), requests = [], chunk = deferred(), listeners = [];
  let input = { locale: 'ko', region: '창원', selected: [], theme: 'history' }, control, revealCount = 0, resetCount = 0;
  const planModule = load('../features/planner/hooks/usePlanRequest.ts', {
    react: hooks.react, '../../../lib/request-budget.js': { CLIENT_BUDGET_MS: { plan: 100 } }, '../../../lib/reduced-motion.js': { scrollToSection: () => false },
    '../services/api': { plannerJson: (_url, options) => { const request = deferred(); requests.push({ ...request, options }); return request.promise; }, planFailureKind: () => 'server' },
    '../services/plan-response': { planResponse: value => value }, '../../../lib/planner-criteria.js': { criteriaSignature: value => JSON.stringify(value) },
    '../condition-copy': { planNotices: { idle: ['', ''], loading: ['', ''], error: ['', ''], offline: ['', ''], updated: ['', ''], empty: ['', ''] } },
    '../../../lib/plan-result-cache.js': { readPlanResultCache: () => null, writePlanResultCache() {} },
  }, { __env: { DEV: dev, VITE_WAVE_LOCAL_EXAMPLES: localExamples }, __loadExample: () => chunk.promise, navigator: { onLine: true }, window: { document: { activeElement: null }, localStorage: {}, clearTimeout() {}, setTimeout: () => 1, scrollTo() {}, addEventListener: (type, fn, options) => listeners.push({ type, fn, options }) } }, code => code.replaceAll('import.meta.env', '__env').replace('import("../services/local-example-plan")', '__loadExample()'));
  const render = changes => { input = { ...input, ...changes }; control = hooks.render(() => planModule.usePlanRequest(input)); };
  render();
  return { render, requests, get control() { return control; }, get revealCount() { return revealCount; }, get resetCount() { return resetCount; }, run: () => control.runPlan({ resetRouteData() {}, resetAudio() { resetCount++; }, onRevealResults() { revealCount++; } }), resolveChunk: () => chunk.resolve({ localExamplePlan: region => ({ places: [place('9900000001')], region, statuses: [] }) }), interact: () => listeners.filter(l => l.type === 'pointerdown' && !l.options.signal.aborted).forEach(l => l.fn({ type: 'pointerdown', target: {} })), cleanup: hooks.cleanup };
}
for (const cancel of ['reset', 'new request', 'unmount', 'changed criteria']) test(`DEV example import does not overwrite state after ${cancel}`, async () => {
  const app = planFixture();
  const first = app.run(); app.requests[0].reject(Error('synthetic provider failure')); await tick();
  let second;
  if (cancel === 'reset') app.control.resetPlan();
  if (cancel === 'unmount') app.cleanup();
  if (cancel === 'changed criteria') app.render({ region: '통영' });
  if (cancel === 'new request') { second = app.run(); app.requests[1].resolve({ places: [place('2002')], statuses: [{ state: 'live' }] }); await second; }
  const expected = app.control.getPlan();
  app.resolveChunk();
  assert.equal(await first, false);
  assert.equal(app.control.getPlan(), expected);
  assert.equal(app.resetCount, cancel === 'new request' ? 1 : 0);
});
test('current DEV fallback reveals examples while explicit interaction suppresses navigation', async () => {
  for (const interacted of [false, true]) {
    const app = planFixture(); const result = app.run();
    app.requests[0].reject(Error('synthetic provider failure')); await tick();
    if (interacted) app.interact();
    app.resolveChunk(); assert.equal(await result, true);
    assert.equal(app.control.getPlan().region, '창원');
    assert.equal(app.revealCount, interacted ? 0 : 1);
  }
});
for (const [name, dev, setting] of [['production', false, undefined], ['explicitly disabled DEV', true, 'off']]) test(name + ' failures do not load or show DEV examples', async () => {
  const app = planFixture(dev, setting); const result = app.run();
  app.requests[0].reject(Error('synthetic provider failure'));
  assert.equal(await result, false);
  assert.equal(app.control.getPlan(), null);
  app.render(); assert.equal(app.control.planError, 'server');
});

for (const dev of [true, false]) test(`only DEV local examples receive arbitrary display pins (DEV=${dev})`, () => {
  const example = place('9900000002');
  const actualUnknown = { ...place('1002'), source: '한국관광공사' };
  const actualKnown = { ...place('1003', '128.2', '35.1'), source: '한국관광공사' };
  const app = sensoryFixture([example, actualUnknown, actualKnown], dev);
  const pins = all(app.tree).filter(n => n.type === 'g' && n.props.role === 'button');
  assert.deepEqual(pins.map(n => n.props['aria-label']), [
    ...(dev ? ['Place 9900000002 시연용 임의 위치'] : []), 'Place 1003 위치',
  ]);
  const list = app.find(n => n.type === 'li' && text(n).startsWith('Place 1002'));
  assert.match(text(list), /좌표 미확인 · 목록으로 제공/);
  assert.doesNotMatch(text(list), /시연용/);
  assert.equal(text(app.tree).includes('지도에는 시연용 임의 위치를 표시하며 실제 위치가 아닙니다.'), dev);
});

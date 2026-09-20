import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as storageApi from '../lib/current-trip-storage.js';
import * as identities from '../lib/trip-identity.js';
import * as books from '../lib/travel-book.js';
import * as accountModel from '../lib/account-travel/model.js';
import * as itinerarySchedule from '../features/planner/optimization/itinerary-schedule.js';
import * as visitHours from '../lib/visit-hours.js';

function loadTs(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', code)(exports, name => { assert.ok(dependencies[name], name); return dependencies[name]; });
  return exports;
}

// Execute the real save handler with in-memory Storage and React hook slots.
// No browser, account endpoint, timer or provider is started.
function fixture({ account = false, afterRead } = {}) {
  const values = new Map(), writes = [], requests = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem(key, value) { writes.push(key); values.set(key, value); } };
  const identity = identities.newTripIdentity();
  if (account) identity.binding = { kind: 'account', id: crypto.randomUUID(), userId: 'owner', revision: 1, role: 'owner' };
  storageApi.replaceCurrentTrip(storage, { ...storageApi.emptyTrip('창원', '2026-09-20', '2026-09-20'), [identities.TRIP_IDENTITY_KEY]: JSON.stringify(identity) });
  const slots = [], effects = [], frames = [];
  let cursor = 0;
  const effect = (fn, deps) => { const i = cursor++, old = slots[i]; if (!deps || !old || deps.some((v, j) => v !== old[j])) { slots[i] = deps; effects.push(fn); } };
  const hooks = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; }, useEffect: effect, useLayoutEffect: effect,
    useCallback(fn) { return fn; },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
  };
  const conflict = () => { const current = JSON.parse(values.get(storageApi.CURRENT_TRIP_KEY)); current.values[storageApi.REGION_KEY] = '하동'; values.set(storageApi.CURRENT_TRIP_KEY, JSON.stringify(current)); };
  const dependencies = {
    react: hooks, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }, 'next/link': {},
    '../../components/LoadingState': {}, '../auth/hooks/useHydratedSession': { useHydratedSession: () => ({ data: account ? { user: { id: 'owner' } } : null, isPending: false }) },
    '../../lib/account-travel/model.js': accountModel, '../../lib/trip-identity.js': identities,
    '../../lib/travel-book.js': books, '../../lib/current-trip-storage.js': storageApi,
    '../account-travel/client': { AccountTravelError: class extends Error {}, travelRequest: async (path, payload) => {
      requests.push({ path, payload });
      if (!payload) { afterRead?.(conflict); return { payload: { title: '현재 여행', note: '', status: 'planning' } }; }
      return { id: identity.binding.id, revision: 2, role: 'owner' };
    } },
  };
  // Exercise the real warning decision too; only native dialog DOM behavior is
  // outside this ownership harness (covered by browser confirmation tests).
  dependencies['../planner/trip-timing-review'] = loadTs('../features/planner/trip-timing-review.ts', {
    './optimization/itinerary-schedule.js': itinerarySchedule,
    './utils': loadTs('../features/planner/utils.ts', {}),
    '../../lib/visit-hours.js': visitHours,
    './services/visit-info': { cachedVisitInfo: () => null },
  });
  dependencies['../planner/components/TripTimingConfirmation'] = loadTs('../features/planner/components/TripTimingConfirmation.tsx', {
    react: hooks, 'react/jsx-runtime': dependencies['react/jsx-runtime'],
    '../hooks/usePlaceDialogFocus': { usePlaceDialogFocus: () => ({ current: null }) },
    '../services/visit-info': { subscribeVisitInfo: () => () => {}, visitInfoVersion: () => 0, serverVisitInfoVersion: () => 0 },
  });
  const exports = {}, code = ts.transpileModule(readFileSync(new URL('../features/travel-book/TravelBookArchiveAction.tsx', import.meta.url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('exports', 'require', 'window', 'localStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', code)(exports, name => { assert.ok(dependencies[name], name); return dependencies[name]; }, { localStorage: storage }, storage, fn => frames.push(fn), () => {}, () => 1, () => {});
  const input = { region: '창원', themes: [], theme: '', profiles: [], travelStart: '2026-09-20', travelEnd: '2026-09-20', dayStartTime: '10:00', travelMode: 'car', scheduleAssignments: { '1001': '2026-09-20' }, places: [{ id: '1001', name: '여행지', city: '창원', source: '합성 테스트' }] };
  const render = () => { cursor = 0; const tree = exports.default(input); effects.splice(0).forEach(fn => fn()); return tree; };
  render(); frames.splice(0).forEach(fn => fn()); render(); writes.length = 0;
  // First child is the explicit save control; the public API intentionally returns void.
  const click = () => render().props.children[0].props.onClick();
  const finish = () => new Promise(resolve => setImmediate(resolve));
  return { conflict, click, finish, writes, requests, values, render };
}

test('a stale tab cannot write the local travel book before detecting the ownership conflict', async () => {
  const f = fixture(); f.conflict(); const before = [...f.values]; f.click(); await f.finish();
  assert.deepEqual(f.writes, []); assert.deepEqual([...f.values], before); assert.deepEqual(f.requests, []);
});

test('an account lookup followed by a cross-tab change stops before the account POST', async () => {
  const f = fixture({ account: true, afterRead: conflict => conflict() });
  f.click(); await f.finish();
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].payload, undefined);
  assert.deepEqual(f.writes, []);
});

test('the unchanged current tab can still explicitly save a local travel book', async () => {
  const f = fixture(); f.click(); await f.finish();
  assert.ok(f.writes.includes(books.TRAVEL_BOOK_STORAGE_KEY));
  assert.equal(JSON.parse(f.values.get(books.TRAVEL_BOOK_STORAGE_KEY))[0].places[0].id, '1001');
});

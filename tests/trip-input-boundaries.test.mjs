import assert from 'node:assert/strict';
import test from 'node:test';
import { addFestivalToTrip } from '../lib/festival-trip.js';
import { replaceTripWithBackup } from '../lib/trip-import.js';
import { createTravelBookSnapshot, TRAVEL_BOOK_STORAGE_KEY, travelBookRestorePayload } from '../lib/travel-book.js';
import { fatigueRemovals, selectJourneyStops, validateJourneyApplication } from '../lib/naru-journey.js';
import { getTabStorage } from '../lib/session-storage.js';
import { clearTripDraft, readTripDraft, writeTripDraft } from '../lib/account-travel/draft.js';
import { CURRENT_TRIP_KEY, REGION_KEY, THEMES_KEY, emptyTrip, readTripValue, replaceCurrentTrip, tripStorageFailed, writeTripValue } from '../lib/current-trip-storage.js';

const start = '2026-09-20', end = '2026-09-22';
const idsKey = 'wave-saved-places', catalogKey = 'wave-saved-place-catalog-v1', scheduleKey = 'wave-trip-schedule-v1', orderKey = 'wave-trip-order-v1';
const place = (id, patch = {}) => ({ id, name: `합성 검증 장소 ${id}`, city: '통영', contentTypeId: '14', mapX: '128.43', mapY: '34.84', accessibility: [], source: '검증 fixture', ...patch });
const festival = (patch = {}) => place('2001', { contentTypeId: '15', startDate: '2026-09-19', endDate: end, ...patch });
const existing = (id, date = start, fixed = false) => ({ id, date, fixed, place: place(id) });
const draft = (patch = {}) => ({ action: 'adapt-itinerary', start, end, stops: [], restOnly: true, relaxed: true, removed: [], ...patch });
const state = (patch = {}) => ({ saved: ['1001', '1002'], assignments: { '1001': start, '1002': start }, fixed: {}, start, ...patch });
function storage() {
  const entries = new Map();
  return {
    entries, failWrite: false, failMirrors: false, failKey: '',
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite || key === this.failKey || this.failMirrors && key !== CURRENT_TRIP_KEY) throw new Error('quota'); entries.set(key, value); },
    removeItem(key) { entries.delete(key); },
  };
}
function tripValues(patch = {}) {
  return { ...emptyTrip('통영', start, end),
    [idsKey]: '["1001","1002"]', [catalogKey]: JSON.stringify([place('1001'), place('1002')]),
    [orderKey]: '{"mode":"manual","ids":["1002","1001"]}',
    [scheduleKey]: JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: '09:30', scheduleAssignments: { '1001': start, '1002': '2026-09-21' },
      fixedVisits: { '1002': { kind: 'visit', time: '14:00', position: 0 } }, visitMinutesByPlaceId: { '1001': 75 },
      breakMinutesByPlaceId: { '1001': 40 }, dayDeadlines: { [start]: { time: '18:00', returnMinutes: 30, bufferMinutes: 15 } },
      comfort: { maxWalkMinutes: 10, breakEveryMinutes: 60, breakMinutes: 40 } }),
    ...patch,
  };
}

test('adding a festival preserves existing visit dates, fixed appointments, order and long rests', () => {
  const store = storage(), original = tripValues();
  replaceCurrentTrip(store, original);
  assert.equal(addFestivalToTrip(store, festival(), '2026-09-19'), true);
  const before = JSON.parse(original[scheduleKey]), after = JSON.parse(readTripValue(store, scheduleKey));
  assert.equal(after.travelStart, '2026-09-19');
  assert.equal(after.travelEnd, end);
  assert.deepEqual(after.scheduleAssignments, { ...before.scheduleAssignments, '2001': '2026-09-19' });
  for (const key of ['fixedVisits', 'breakMinutesByPlaceId', 'dayDeadlines', 'comfort', 'dayStartTime']) assert.deepEqual(after[key], before[key]);
  assert.equal(after.visitMinutesByPlaceId['1001'], 75);
  assert.deepEqual(JSON.parse(readTripValue(store, orderKey)).ids, ['1002', '1001', '2001']);
  assert.equal(readTripValue(store, REGION_KEY), '통영');
});

test('extending the trip start materializes an old default visit date before adding the festival', () => {
  const store = storage();
  replaceCurrentTrip(store, tripValues({ [scheduleKey]: JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: '10:00', scheduleAssignments: { '1002': '2026-09-21' } }) }));
  addFestivalToTrip(store, festival(), '2026-09-19');
  const after = JSON.parse(readTripValue(store, scheduleKey));
  assert.equal(after.scheduleAssignments['1001'], start);
  assert.equal(after.scheduleAssignments['2001'], '2026-09-19');
});

test('festival duplicate clicks do not create another visit or change existing dates', () => {
  const store = storage();
  addFestivalToTrip(store, festival(), start);
  const before = [...store.entries];
  assert.equal(addFestivalToTrip(store, festival(), '2026-09-21'), false);
  assert.deepEqual([...store.entries], before);
});

test('an unavailable festival date, over-capacity itinerary and distant date do not write storage', () => {
  const cases = [
    [tripValues(), festival(), '2026-09-23'],
    [tripValues(), festival({ startDate: '2026-09-30', endDate: '2026-10-01' }), '2026-09-30'],
    [tripValues({ [idsKey]: JSON.stringify(Array.from({ length: 12 }, (_, index) => String(1001 + index))) }), festival(), start],
  ];
  for (const [original, event, date] of cases) {
    const store = storage(); replaceCurrentTrip(store, original); const before = [...store.entries];
    assert.throws(() => addFestivalToTrip(store, event, date));
    assert.deepEqual([...store.entries], before);
  }
});

test('a failed festival commit is atomic and cannot be applied by a later unrelated edit', () => {
  const store = storage(), original = tripValues();
  replaceCurrentTrip(store, original);
  const before = [...store.entries]; store.failWrite = true;
  assert.throws(() => addFestivalToTrip(store, festival(), start), /quota/);
  assert.deepEqual([...store.entries], before);
  store.failWrite = false;
  writeTripValue(store, THEMES_KEY, '["history"]');
  assert.equal(readTripValue(store, idsKey), original[idsKey]);
  assert.equal(readTripValue(store, scheduleKey), original[scheduleKey]);
});

test('festival addition must preserve pending current-trip edits or refuse without clearing them', () => {
  const store = storage(); replaceCurrentTrip(store, tripValues());
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, idsKey, '["1001","1002","1003"]'));
  store.failWrite = false;
  let refused = false;
  try { addFestivalToTrip(store, festival(), start); } catch { refused = true; }
  if (refused) {
    assert.equal(tripStorageFailed(store), true);
    writeTripValue(store, THEMES_KEY, '["history"]');
  }
  assert.ok(JSON.parse(readTripValue(store, idsKey)).includes('1003'), 'Adding a festival must not delete a visit whose last storage write failed.');
});

test('a successful festival commit remains authoritative when legacy mirror writes fail', () => {
  const store = storage(); replaceCurrentTrip(store, tripValues()); store.failMirrors = true;
  assert.equal(addFestivalToTrip(store, festival(), start), true);
  assert.ok(JSON.parse(readTripValue(store, idsKey)).includes('2001'));
  assert.equal(tripStorageFailed(store), false);
});

test('malformed new-festival input is rejected before creating an unresolvable saved place', () => {
  for (const patch of [{ id: 2001 }, { id: ['2001'] }, { name: '' }, { name: null }, { city: undefined }]) {
    const store = storage(); const before = [...store.entries];
    assert.throws(() => addFestivalToTrip(store, festival(patch), start));
    assert.deepEqual([...store.entries], before);
  }
});

test('malformed current IDs or missing current dates cannot be normalized into a different trip by festival addition', () => {
  for (const patch of [{ [idsKey]: '[1001,"1002"]' }, { [idsKey]: '["1001","1001"]' }, { [scheduleKey]: '{}' }]) {
    const store = storage(); replaceCurrentTrip(store, tripValues(patch)); const before = [...store.entries];
    assert.throws(() => addFestivalToTrip(store, festival(), start));
    assert.deepEqual([...store.entries], before);
  }
});

test('opening a new trip preserves the old manual visit order and dates in the recoverable backup', () => {
  const store = storage(), original = tripValues({
    [idsKey]: '["1001","1002","1003"]', [catalogKey]: JSON.stringify([place('1001'), place('1002'), place('1003')]),
    [orderKey]: '{"mode":"manual","ids":["1002","1001","1003"]}',
    [scheduleKey]: JSON.stringify({ ...JSON.parse(tripValues()[scheduleKey]), scheduleAssignments: { '1001': start, '1002': start, '1003': start }, fixedVisits: { '1003': { kind: 'visit', time: '14:00', position: 2 } } }),
  }), incoming = emptyTrip('거제', '2026-10-01', '2026-10-02');
  replaceCurrentTrip(store, original);
  replaceTripWithBackup(store, incoming);
  assert.equal(readTripValue(store, scheduleKey), incoming[scheduleKey]);
  const books = JSON.parse(store.getItem(TRAVEL_BOOK_STORAGE_KEY));
  assert.equal(books.length, 1);
  const restored = travelBookRestorePayload(books[0]), before = JSON.parse(original[scheduleKey]);
  assert.deepEqual(restored.savedPlaceIds, ['1002', '1001', '1003'], 'The backup must restore the manually arranged visit order, not the original order in which places were saved.');
  for (const key of ['travelStart', 'travelEnd', 'dayStartTime', 'scheduleAssignments', 'fixedVisits', 'breakMinutesByPlaceId', 'dayDeadlines', 'comfort']) assert.deepEqual(restored.schedule[key], before[key]);
});

test('malformed new trip input is rejected before either the backup or current trip is written', () => {
  const malformed = [null, [], {}, tripValues({ [idsKey]: '[1001]' }), tripValues({ [scheduleKey]: '{}' }), tripValues({ [catalogKey]: '[]' }), tripValues({ [orderKey]: '{"mode":"manual","ids":["9999"]}' })];
  for (const incoming of malformed) {
    const store = storage(); replaceCurrentTrip(store, tripValues());
    store.setItem(TRAVEL_BOOK_STORAGE_KEY, '[]');
    const before = [...store.entries];
    assert.throws(() => replaceTripWithBackup(store, incoming), `Input must be rejected: ${JSON.stringify(incoming)}`);
    assert.deepEqual([...store.entries], before);
  }
});

test('failed backup and failed current-trip commits leave the previous current trip authoritative', () => {
  for (const failedKey of [TRAVEL_BOOK_STORAGE_KEY, CURRENT_TRIP_KEY]) {
    const store = storage(), original = tripValues();
    replaceCurrentTrip(store, original);
    const before = store.getItem(CURRENT_TRIP_KEY); store.failKey = failedKey;
    assert.throws(() => replaceTripWithBackup(store, emptyTrip('거제', '2026-10-01', '2026-10-02')), /quota/);
    assert.equal(store.getItem(CURRENT_TRIP_KEY), before);
    assert.equal(tripStorageFailed(store), false, 'An explicitly rejected new trip must never become an in-place pending edit.');
    store.failKey = '';
    writeTripValue(store, THEMES_KEY, '["history"]');
    assert.equal(readTripValue(store, idsKey), original[idsKey]);
    assert.equal(readTripValue(store, scheduleKey), original[scheduleKey]);
  }
});

test('a failed new-trip commit cannot evict an older saved trip from a full backup archive', () => {
  const store = storage(); replaceCurrentTrip(store, tripValues());
  const books = Array.from({ length: 20 }, (_, index) => createTravelBookSnapshot({
    region: '통영', travelStart: '2026-01-01', travelEnd: '2026-01-01', title: `합성 보관 여행 ${index}`, note: `보존할 여행 메모 ${index}`,
    places: [place(String(3000 + index))],
  }, new Date(Date.UTC(2026, 0, 1, index)).toISOString()));
  store.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify(books));
  const current = store.getItem(CURRENT_TRIP_KEY); store.failKey = CURRENT_TRIP_KEY;
  assert.throws(() => replaceTripWithBackup(store, emptyTrip('거제', '2026-10-01', '2026-10-02')));
  assert.equal(store.getItem(CURRENT_TRIP_KEY), current);
  const after = JSON.parse(store.getItem(TRAVEL_BOOK_STORAGE_KEY));
  for (const previous of books) assert.deepEqual(after.find(book => book.id === previous.id), previous, 'A rejected new trip must not delete or rewrite a different archived trip.');
});

test('new trip import rejects pending edits before modifying any backup or current-trip record', () => {
  const store = storage(); replaceCurrentTrip(store, tripValues());
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, idsKey, '["1001","1002","1003"]'));
  store.failWrite = false;
  const before = [...store.entries];
  assert.throws(() => replaceTripWithBackup(store, emptyTrip('거제', '2026-10-01', '2026-10-02')));
  assert.deepEqual([...store.entries], before);
  assert.equal(tripStorageFailed(store), true);
  writeTripValue(store, THEMES_KEY, '["history"]');
  assert.deepEqual(JSON.parse(readTripValue(store, idsKey)), ['1001', '1002', '1003']);
});

test('fatigue reduction removes only excess optional visits on the requested date', () => {
  const stops = [existing('1001'), existing('1002', start, true), existing('1003'), existing('1004'), existing('1005', '2026-09-21'), existing('1006', '2026-09-21'), existing('1007', '2026-09-21')];
  const before = JSON.stringify(stops);
  const removed = fatigueRemovals(stops, [start, '2026-09-21'], start);
  assert.deepEqual(removed.map(item => item.place.id), ['1003', '1004']);
  assert.ok(removed.every(item => item.date === start));
  assert.equal(JSON.stringify(stops), before);
});

test('three fixed appointments stay intact even if fatigue reduction cannot reach two visits', () => {
  const stops = [existing('1001', start, true), existing('1002', start, true), existing('1003', start, true), existing('1004')];
  assert.deepEqual(fatigueRemovals(stops, [start]).map(item => item.place.id), ['1004']);
});

test('unresolved existing place identities are never proposed for deletion', () => {
  const stops = [existing('1001'), existing('1002'), { id: '1003', date: start, fixed: false }];
  assert.deepEqual(fatigueRemovals(stops, [start]), []);
});

test('source-confirmed weekly closure moves a candidate to an open date without inventing a holiday schedule', () => {
  const selected = selectJourneyStops({ places: [place('2001')], days: ['2026-09-21', '2026-09-22'], visitById: { '2001': { status: 'available', hours: '09:00~18:00', restDays: '매주 월요일' } } });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].date, '2026-09-22');
  assert.equal(selectJourneyStops({ places: [place('2001')], days: ['2026-09-21'] }).length, 1, 'Missing source data is not proof of closure.');
});

test('festival dates are rechecked during application, including conflicting visit-info dates during selection', () => {
  const stops = selectJourneyStops({ places: [festival()], days: [start, '2026-09-21'], visitById: { '2001': { status: 'available', eventStart: '20260921', eventEnd: '20260922', restDays: '연중무휴', hours: '09:00~18:00' } } });
  assert.equal(stops[0].date, '2026-09-21');
  const invalidStop = { ...stops[0], date: '2026-09-23' };
  assert.ok(validateJourneyApplication(draft({ restOnly: false, stops: [invalidStop] }), state()));
});

test('deletion validation rejects a fixed, moved, missing, duplicated or simultaneously replaced visit', () => {
  const removal = { place: place('1001'), date: start };
  assert.equal(validateJourneyApplication(draft({ removed: [removal] }), state()), '');
  for (const current of [state({ fixed: { '1001': { time: '14:00' } } }), state({ assignments: { '1001': '2026-09-21' } }), state({ saved: ['1002'] })]) assert.ok(validateJourneyApplication(draft({ removed: [removal] }), current));
  assert.ok(validateJourneyApplication(draft({ removed: [removal, removal] }), state()));
  assert.ok(validateJourneyApplication(draft({ restOnly: false, removed: [removal], stops: [{ place: place('2001'), date: start, minutes: 60, breakMinutes: 20, replaces: '1001' }] }), state()));
});

test('malformed deletion collections return a validation error rather than throwing during application', () => {
  for (const removed of [{ length: 1 }, 1, '1001']) {
    let error;
    assert.doesNotThrow(() => { error = validateJourneyApplication(draft({ removed }), state()); });
    assert.ok(error);
  }
});

test('rest-only flags must be booleans and requested rest days must stay inside the trip', () => {
  for (const restOnly of ['false', 1, [], {}]) assert.ok(validateJourneyApplication(draft({ restOnly }), state()));
  for (const restDay of ['2026-09-23', [start], 'not-a-date']) assert.ok(validateJourneyApplication(draft({ restDay }), state()));
});

test('a targeted fatigue adjustment cannot delete a visit on a different date', () => {
  assert.ok(validateJourneyApplication(draft({ restDay: '2026-09-21', removed: [{ place: place('1001'), date: start }] }), state()));
});

test('session recovery treats a throwing browser Storage getter as unavailable', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.defineProperty({}, 'sessionStorage', { get() { throw new Error('SecurityError'); } }) });
  const store = getTabStorage();
  assert.equal(store, null);
  assert.equal(readTripDraft(store, 'owner', 'trip'), null);
  assert.equal(writeTripDraft(store, 'owner', 'trip', 1, {}), false);
  assert.doesNotThrow(() => clearTripDraft(store, 'owner', 'trip'));
});

test('session Storage acquisition is safe during server rendering and returns the actual available tab store', t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  delete globalThis.window;
  assert.equal(getTabStorage(), null);
  const store = storage();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: store } });
  assert.equal(getTabStorage(), store);
});

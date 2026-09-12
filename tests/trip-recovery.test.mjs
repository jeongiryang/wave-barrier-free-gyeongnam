import assert from 'node:assert/strict';
import test from 'node:test';
import { clearTripDraft, readTripDraft, tripDraftKey, writeTripDraft } from '../lib/account-travel/draft.js';
import { CURRENT_TRIP_KEY, REGION_KEY, THEMES_KEY, emptyTrip, readTripValue, replaceCurrentTrip, subscribeTripStorage, tripStorageFailed, writeTripValue } from '../lib/current-trip-storage.js';

const idsKey = 'wave-saved-places';
const scheduleKey = 'wave-trip-schedule-v1';
const draftPayload = (patch = {}) => ({
  version: 1, title: '검증용 여행', region: '통영', travelStart: '2026-09-20', travelEnd: '2026-09-21',
  dayStartTime: '10:00', themes: ['nature'], placeIds: ['1001'], scheduleAssignments: { '1001': '2026-09-20' },
  note: '아직 계정에 저장하지 않은 메모', status: 'planned', ...patch,
});
function storage() {
  const entries = new Map();
  return {
    entries, failRead: false, failWrite: false, failRemove: false, failMirrors: false,
    getItem(key) { if (this.failRead) throw new Error('read-blocked'); return entries.get(key) ?? null; },
    setItem(key, value) { if (this.failWrite || this.failMirrors && key !== CURRENT_TRIP_KEY) throw new Error('quota'); entries.set(key, value); },
    removeItem(key) { if (this.failRemove) throw new Error('remove-blocked'); entries.delete(key); },
  };
}
function populatedTrip(region = '통영', id = '1001') {
  return {
    ...emptyTrip(region, '2026-09-20', '2026-09-21'),
    [idsKey]: JSON.stringify([id]),
    'wave-saved-place-catalog-v1': JSON.stringify([{ id, name: '합성 검증 장소', city: region }]),
    'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: [id] }),
  };
}

test('account recovery is scoped to both account and trip with unambiguous encoded keys', () => {
  const store = storage();
  assert.equal(writeTripDraft(store, 'owner:a', 'trip/b', 3, draftPayload()), true);
  assert.equal(readTripDraft(store, 'other', 'trip/b'), null);
  assert.equal(readTripDraft(store, 'owner:a', 'another-trip'), null);
  assert.notEqual(tripDraftKey('owner:a', 'trip'), tripDraftKey('owner', 'a:trip'));
  assert.notEqual(tripDraftKey('owner/a', 'trip'), tripDraftKey('owner%2Fa', 'trip'));
  assert.equal(readTripDraft(store, 'owner:a', 'trip/b').revision, 3);
});

test('recovery preserves incomplete in-progress fields instead of discarding an unsavable draft', () => {
  const store = storage();
  const payload = draftPayload({ title: '', travelStart: '', dayStartTime: '', note: '  작성 중인 메모\n둘째 줄  ' });
  assert.equal(writeTripDraft(store, 'owner', 'trip', 2, payload), true);
  assert.deepEqual(readTripDraft(store, 'owner', 'trip'), { version: 1, revision: 2, payload });
});

test('new recovery revisions preserve the latest edit and do not mutate caller data', () => {
  const store = storage();
  const payload = draftPayload();
  const before = JSON.stringify(payload);
  writeTripDraft(store, 'owner', 'trip', 1, payload);
  writeTripDraft(store, 'owner', 'trip', 2, { ...payload, note: '저장 응답을 기다리며 새로 쓴 메모' });
  assert.equal(readTripDraft(store, 'owner', 'trip').revision, 2);
  assert.equal(readTripDraft(store, 'owner', 'trip').payload.note, '저장 응답을 기다리며 새로 쓴 메모');
  assert.equal(JSON.stringify(payload), before);
});

test('failed or oversized recovery writes report failure and preserve the previous recoverable draft', () => {
  const store = storage();
  const payload = draftPayload();
  writeTripDraft(store, 'owner', 'trip', 1, payload);
  store.failWrite = true;
  assert.equal(writeTripDraft(store, 'owner', 'trip', 2, draftPayload({ note: '새 내용' })), false);
  store.failWrite = false;
  assert.equal(writeTripDraft(store, 'owner', 'trip', 2, draftPayload({ note: 'x'.repeat(17000) })), false);
  assert.deepEqual(readTripDraft(store, 'owner', 'trip'), { version: 1, revision: 1, payload });
});

test('damaged or unreadable recovery storage cannot become an account editing payload', () => {
  const store = storage();
  for (const value of ['broken JSON', 'null', JSON.stringify({ version: 99, revision: 1, payload: draftPayload() }), JSON.stringify({ version: 1, revision: '1', payload: draftPayload() }), JSON.stringify({ version: 1, revision: 1, payload: draftPayload({ placeIds: ['https://untrusted.example'] }) }), 'x'.repeat(16001)]) {
    store.entries.set(tripDraftKey('owner', 'trip'), value);
    assert.equal(readTripDraft(store, 'owner', 'trip'), null);
  }
  store.failRead = true;
  assert.equal(readTripDraft(store, 'owner', 'trip'), null);
});

test('clearing one recovered draft leaves other trips and accounts intact', () => {
  const store = storage();
  for (const [userId, tripId] of [['owner', 'one'], ['owner', 'two'], ['other', 'one']]) writeTripDraft(store, userId, tripId, 1, draftPayload());
  clearTripDraft(store, 'owner', 'one');
  assert.equal(readTripDraft(store, 'owner', 'one'), null);
  assert.ok(readTripDraft(store, 'owner', 'two'));
  assert.ok(readTripDraft(store, 'other', 'one'));
  store.failRemove = true;
  assert.doesNotThrow(() => clearTripDraft(store, 'owner', 'two'));
  assert.ok(readTripDraft(store, 'owner', 'two'));
});

test('the first field edit migrates the full legacy itinerary instead of losing untouched fields', () => {
  const store = storage(), original = populatedTrip();
  for (const [key, value] of Object.entries(original)) store.entries.set(key, value);
  store.entries.set('wave-travel-book-v1', '["saved archive"]');
  writeTripValue(store, THEMES_KEY, '["history"]');
  assert.ok(store.getItem(CURRENT_TRIP_KEY));
  assert.equal(readTripValue(store, idsKey), original[idsKey]);
  assert.equal(readTripValue(store, scheduleKey), original[scheduleKey]);
  assert.equal(readTripValue(store, THEMES_KEY), '["history"]');
  assert.equal(store.getItem('wave-travel-book-v1'), '["saved archive"]');
});

test('failed field edits remain pending and the latest value wins when storage becomes writable', () => {
  const store = storage(), original = populatedTrip();
  replaceCurrentTrip(store, original);
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["nature"]'), /quota/);
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["history"]'), /quota/);
  assert.equal(tripStorageFailed(store), true);
  assert.equal(readTripValue(store, THEMES_KEY), original[THEMES_KEY]);
  store.failWrite = false;
  writeTripValue(store, REGION_KEY, '거제');
  assert.equal(readTripValue(store, THEMES_KEY), '["history"]');
  assert.equal(readTripValue(store, REGION_KEY), '거제');
  assert.equal(readTripValue(store, idsKey), original[idsKey]);
  assert.equal(tripStorageFailed(store), false);
});

test('storage failure notifications recover and unsubscribe without affecting another storage instance', t => {
  const store = storage(), other = storage();
  replaceCurrentTrip(store, populatedTrip());
  const observations = [];
  const unsubscribe = subscribeTripStorage(() => observations.push(tripStorageFailed(store)));
  t.after(unsubscribe);
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["history"]'));
  assert.equal(observations.at(-1), true);
  assert.equal(tripStorageFailed(other), false);
  store.failWrite = false;
  writeTripValue(store, THEMES_KEY, '["history"]');
  assert.equal(observations.at(-1), false);
  const count = observations.length;
  unsubscribe();
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["nature"]'));
  assert.equal(observations.length, count);
});

test('a failed new-trip or archived-trip replacement cannot be committed by an unrelated old-trip edit', () => {
  const store = storage(), original = populatedTrip();
  replaceCurrentTrip(store, original);
  store.failWrite = true;
  assert.throws(() => replaceCurrentTrip(store, populatedTrip('하동', '2001')), /quota/);
  assert.equal(readTripValue(store, idsKey), original[idsKey]);
  store.failWrite = false;
  writeTripValue(store, THEMES_KEY, '["history"]');
  assert.equal(readTripValue(store, REGION_KEY), original[REGION_KEY], 'A failed replacement was never accepted by the UI.');
  assert.equal(readTripValue(store, idsKey), original[idsKey]);
  assert.equal(readTripValue(store, scheduleKey), original[scheduleKey]);
});

test('retrying one failed field does not overwrite an independently saved field from another tab', () => {
  const store = storage(), original = populatedTrip();
  replaceCurrentTrip(store, original);
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["history"]'));
  const newerSchedule = JSON.stringify({ travelStart: '2026-09-20', travelEnd: '2026-09-21', dayStartTime: '11:30', scheduleAssignments: { '1001': '2026-09-21' } });
  // Simulate another tab's committed record, not this module's pending writes.
  store.entries.set(CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values: { ...original, [scheduleKey]: newerSchedule } }));
  store.failWrite = false;
  writeTripValue(store, THEMES_KEY, '["history"]');
  assert.equal(readTripValue(store, scheduleKey), newerSchedule);
  assert.equal(readTripValue(store, THEMES_KEY), '["history"]');
});

test('an explicitly successful replacement clears failed edits belonging to the previous trip', () => {
  const store = storage();
  replaceCurrentTrip(store, populatedTrip());
  store.failWrite = true;
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["history"]'));
  store.failWrite = false;
  const replacement = populatedTrip('하동', '2001');
  replaceCurrentTrip(store, replacement);
  writeTripValue(store, REGION_KEY, '하동');
  assert.equal(readTripValue(store, idsKey), replacement[idsKey]);
  assert.equal(readTripValue(store, THEMES_KEY), replacement[THEMES_KEY]);
  assert.equal(tripStorageFailed(store), false);
});

test('mirror failures never turn an authoritative successful commit into a failed or mixed trip', () => {
  const store = storage();
  replaceCurrentTrip(store, populatedTrip());
  store.failMirrors = true;
  const replacement = populatedTrip('하동', '2001');
  replaceCurrentTrip(store, replacement);
  assert.equal(tripStorageFailed(store), false);
  assert.equal(readTripValue(store, idsKey), replacement[idsKey]);
  assert.notEqual(store.getItem(idsKey), replacement[idsKey]);
});

test('a damaged canonical record remains untouched instead of silently restoring legacy data', () => {
  const store = storage();
  store.entries.set(CURRENT_TRIP_KEY, '{"version":99}');
  store.entries.set(idsKey, '["legacy"]');
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["history"]'), /INVALID_CURRENT_TRIP/);
  assert.equal(store.getItem(CURRENT_TRIP_KEY), '{"version":99}');
  assert.equal(store.getItem(idsKey), '["legacy"]');
});

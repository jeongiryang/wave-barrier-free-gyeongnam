import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TRIP_IDENTITY_KEY, ensureTripIdentity, newTripIdentity, readTripIdentity, writeTripIdentity,
} from '../lib/trip-identity.js';
import {
  CURRENT_TRIP_KEY, REGION_KEY, THEMES_KEY, readTripValue, replaceCurrentTrip, writeTripValue,
} from '../lib/current-trip-storage.js';

const tripId = '12345678-1234-4123-8123-123456789abc';
const accountId = '87654321-4321-4321-9321-cba987654321';
const uuidV4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const identity = (patch = {}) => ({ version: 1, id: tripId, binding: null, share: null, ...patch });
const accountBinding = () => ({ kind: 'account', id: accountId, userId: 'account-owner', revision: 3, role: 'owner' });
const sharedLink = () => ({ id: 'a1b2c3d4e5f6', revision: 2, expiresAt: 1_800_000_000_000 });
const tripValues = () => ({
  [REGION_KEY]: '진주',
  [THEMES_KEY]: '["history"]',
  'wave-saved-places': '["1950218","2796756"]',
  'wave-saved-place-catalog-v1': JSON.stringify([{ id: '1950218', name: '진주청동기문화박물관' }, { id: '2796756', name: '남가람박물관' }]),
  'wave-trip-order-v1': '{"mode":"manual","ids":["1950218","2796756"]}',
  'wave-trip-schedule-v1': JSON.stringify({ travelStart: '2026-10-14', travelEnd: '2026-10-15', dayStartTime: '09:30', travelMode: 'car', scheduleAssignments: { '1950218': '2026-10-14', '2796756': '2026-10-15' }, visitMinutesByPlaceId: { '1950218': 120, '2796756': 90 } }),
});

function storage(initial = []) {
  const entries = new Map(initial);
  return {
    entries, writes: [], failRead: false, failCommit: false, failMirrors: false,
    getItem(key) { if (this.failRead) throw new Error('read-blocked'); return entries.get(key) ?? null; },
    setItem(key, value) {
      if (this.failCommit && key === CURRENT_TRIP_KEY || this.failMirrors && key !== CURRENT_TRIP_KEY) throw new Error('quota');
      entries.set(key, value); this.writes.push(key);
    },
  };
}

function withCurrent(value = identity()) {
  const values = { ...tripValues(), [TRIP_IDENTITY_KEY]: JSON.stringify(value) };
  return storage([[CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values })]]);
}

test('a new unsaved trip receives a distinct UUID without a storage binding or shared link', () => {
  assert.equal(TRIP_IDENTITY_KEY, 'wave-trip-identity-v1');
  const first = newTripIdentity(), second = newTripIdentity();
  for (const value of [first, second]) {
    assert.match(value.id, uuidV4);
    assert.deepEqual(value, { version: 1, id: value.id, binding: null, share: null });
  }
  assert.notEqual(first.id, second.id);
});

test('the first identity commit migrates the whole legacy trip without losing its itinerary or archive', () => {
  const original = tripValues();
  const store = storage([...Object.entries(original), ['wave-travel-book-v1', '["existing archive"]']]);
  assert.equal(readTripIdentity(store), null);
  const created = ensureTripIdentity(store);
  assert.match(created.id, uuidV4);
  assert.deepEqual(readTripIdentity(store), created);
  const record = JSON.parse(store.getItem(CURRENT_TRIP_KEY));
  assert.equal(record.version, 1);
  assert.deepEqual(JSON.parse(record.values[TRIP_IDENTITY_KEY]), created);
  for (const [key, value] of Object.entries(original)) assert.equal(readTripValue(store, key), value);
  assert.equal(store.getItem('wave-travel-book-v1'), '["existing archive"]');
  const writeCount = store.writes.length;
  assert.deepEqual(ensureTripIdentity(store), created);
  assert.equal(store.writes.length, writeCount, 'reading an existing ID must not issue a new save');
});

test('an existing account identity and share survive ensure, field edits, whole snapshots and reload', () => {
  const original = identity({ binding: accountBinding(), share: sharedLink() });
  const store = withCurrent(original);
  assert.deepEqual(ensureTripIdentity(store), original);
  assert.equal(store.writes.length, 0);
  writeTripValue(store, THEMES_KEY, '["history","nature"]');
  assert.deepEqual(readTripIdentity(store), original);
  const updated = { ...tripValues(), [THEMES_KEY]: '["history","nature"]' };
  const schedule = JSON.parse(updated['wave-trip-schedule-v1']);
  updated['wave-trip-schedule-v1'] = JSON.stringify({ ...schedule, dayStartTime: '08:00' });
  replaceCurrentTrip(store, updated);
  const reloaded = storage([...store.entries]);
  assert.deepEqual(readTripIdentity(reloaded), original);
  assert.equal(JSON.parse(readTripValue(reloaded, 'wave-trip-schedule-v1')).dayStartTime, '08:00');
  assert.equal(readTripValue(reloaded, THEMES_KEY), '["history","nature"]');
});

test('only an explicitly supplied new identity separates a new trip from a bound saved trip', () => {
  const store = withCurrent(identity({ binding: { kind: 'local', id: 'book-existing' }, share: sharedLink() }));
  const fresh = newTripIdentity();
  replaceCurrentTrip(store, { ...tripValues(), [TRIP_IDENTITY_KEY]: JSON.stringify(fresh) });
  assert.deepEqual(readTripIdentity(store), fresh);
  assert.notEqual(readTripIdentity(store).id, tripId);
  writeTripValue(store, THEMES_KEY, '["nature"]');
  assert.deepEqual(readTripIdentity(store), fresh);
});

test('local and account bindings round-trip without altering the trip contents', () => {
  const store = withCurrent();
  for (const binding of [{ kind: 'local', id: 'book-a02ocw' }, accountBinding()]) {
    const next = identity({ binding, share: sharedLink() });
    writeTripIdentity(store, next);
    assert.deepEqual(readTripIdentity(store), next);
    for (const [key, value] of Object.entries(tripValues())) assert.equal(readTripValue(store, key), value);
  }
});

test('identity serialization removes travel contents, preferences and credentials at every metadata level', () => {
  const clean = identity({ binding: accountBinding(), share: sharedLink() });
  const supplied = {
    ...clean, places: [{ id: '1950218' }], profiles: ['wheelchair'], note: 'private note', token: 'private-owner-token',
    binding: { ...clean.binding, token: 'binding-secret', email: 'private@example.test', profiles: ['wheelchair'] },
    share: { ...clean.share, token: 'share-secret', ownerId: 'private-owner', payload: { note: 'private note' } },
  };
  const before = structuredClone(supplied), store = withCurrent();
  writeTripIdentity(store, supplied);
  assert.deepEqual(readTripIdentity(store), clean);
  assert.deepEqual(JSON.parse(readTripValue(store, TRIP_IDENTITY_KEY)), clean);
  assert.deepEqual(supplied, before, 'sanitizing storage must not mutate the caller');
  assert.doesNotMatch(store.getItem(CURRENT_TRIP_KEY), /private-owner-token|binding-secret|share-secret|private@example|wheelchair|private note/);
});

test('corrupt or unsupported identity records never become an accepted identity', () => {
  for (const raw of ['{broken', 'null', '[]', '"text"', '{}', JSON.stringify(identity({ version: 2 })), JSON.stringify(identity({ id: '' })), JSON.stringify(identity({ id: 'book-not-a-trip-uuid' }))]) {
    const store = withCurrent();
    const record = JSON.parse(store.getItem(CURRENT_TRIP_KEY));
    record.values[TRIP_IDENTITY_KEY] = raw;
    store.entries.set(CURRENT_TRIP_KEY, JSON.stringify(record));
    const before = [...store.entries];
    assert.equal(readTripIdentity(store), null, raw);
    assert.deepEqual([...store.entries], before, 'reading invalid data must not rewrite a trip');
  }
});

test('invalid bindings cannot acquire local or account ownership', () => {
  const invalid = [
    [], { kind: 'unknown', id: accountId }, { kind: 'local', id: '' },
    { kind: 'account', id: 'book-local', userId: 'owner', revision: 1 },
    { kind: 'account', id: accountId, revision: 1 },
    { kind: 'account', id: accountId, userId: '', revision: 1 },
    ...[0, -1, 1.5, '1', null].map(revision => ({ ...accountBinding(), revision })),
  ];
  for (const binding of invalid) {
    const parsed = readTripIdentity(withCurrent(identity({ binding })));
    assert(parsed === null || parsed.binding === null, `invalid binding retained: ${JSON.stringify(binding)}`);
  }
});

test('invalid share IDs, revisions or expiration times cannot become a managed public link', () => {
  const invalid = [
    [], ...['a1b2c3d4e5f', 'a1b2c3d4e5f67', 'g1b2c3d4e5f6'].map(id => ({ ...sharedLink(), id })),
    ...[0, -1, 1.5, '1', null].map(revision => ({ ...sharedLink(), revision })),
    ...[0, -1, null, '2030-01-01', 9e15].map(expiresAt => ({ ...sharedLink(), expiresAt })),
  ];
  for (const share of invalid) {
    const parsed = readTripIdentity(withCurrent(identity({ share })));
    assert(parsed === null || parsed.share === null, `invalid share retained: ${JSON.stringify(share)}`);
  }
  const expiredButValid = identity({ share: { ...sharedLink(), expiresAt: 1_600_000_000_000 } });
  const store = withCurrent();
  writeTripIdentity(store, expiredButValid);
  assert.deepEqual(readTripIdentity(store), expiredButValid, 'a valid expired timestamp remains available to show link expiration');
});

test('an invalid identity write is rejected without replacing the current saved trip', () => {
  for (const bad of [null, [], identity({ version: 99 }), identity({ id: 'not-a-uuid' })]) {
    const store = withCurrent(identity({ binding: accountBinding() })), before = [...store.entries];
    assert.throws(() => writeTripIdentity(store, bad));
    assert.deepEqual([...store.entries], before);
  }
});

test('a failed first identity commit cannot report a saved identity or change the existing trip', () => {
  const store = storage(Object.entries(tripValues())), before = [...store.entries];
  store.failCommit = true;
  assert.throws(() => ensureTripIdentity(store), /quota/);
  assert.deepEqual([...store.entries], before);
  assert.equal(readTripIdentity(store), null);
  store.failCommit = false;
  const saved = ensureTripIdentity(store);
  assert.deepEqual(readTripIdentity(store), saved);
  for (const [key, value] of Object.entries(tripValues())) assert.equal(readTripValue(store, key), value);
});

test('the canonical identity survives failed mirrors and an unrelated stale legacy identity', () => {
  const original = identity({ binding: accountBinding(), share: sharedLink() });
  const store = withCurrent(original);
  store.entries.set(TRIP_IDENTITY_KEY, JSON.stringify(newTripIdentity()));
  store.failMirrors = true;
  writeTripValue(store, THEMES_KEY, '["nature"]');
  const reloaded = storage([...store.entries]);
  assert.deepEqual(readTripIdentity(reloaded), original);
  assert.equal(readTripValue(reloaded, THEMES_KEY), '["nature"]');
});

test('a successful new-trip replacement clears a failed identity edit belonging to the previous trip', () => {
  const original = identity({ binding: accountBinding() }), store = withCurrent(original);
  store.failCommit = true;
  assert.throws(() => writeTripIdentity(store, { ...original, share: sharedLink() }), /quota/);
  assert.deepEqual(readTripIdentity(store), original);
  store.failCommit = false;
  const fresh = newTripIdentity();
  replaceCurrentTrip(store, { ...tripValues(), [TRIP_IDENTITY_KEY]: JSON.stringify(fresh) });
  writeTripValue(store, THEMES_KEY, '["food"]');
  assert.deepEqual(readTripIdentity(store), fresh);
});

test('an unreadable or damaged canonical trip cannot be replaced by a stale identity mirror', () => {
  const store = withCurrent();
  store.entries.set(TRIP_IDENTITY_KEY, JSON.stringify(identity({ binding: accountBinding() })));
  store.entries.set(CURRENT_TRIP_KEY, '{"version":99,"values":{}}');
  const before = [...store.entries];
  assert.equal(readTripIdentity(store), null);
  assert.throws(() => ensureTripIdentity(store));
  assert.deepEqual([...store.entries], before);
  store.failRead = true;
  assert.equal(readTripIdentity(store), null);
  assert.deepEqual([...store.entries], before);
});

test('an array-shaped canonical values record cannot be migrated into an empty new trip', () => {
  const store = storage(Object.entries(tripValues()));
  store.entries.set(TRIP_IDENTITY_KEY, JSON.stringify(identity({ binding: accountBinding() })));
  store.entries.set(CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values: [] }));
  const before = [...store.entries];
  assert.equal(readTripIdentity(store), null);
  assert.throws(() => ensureTripIdentity(store));
  assert.deepEqual([...store.entries], before, 'a malformed authoritative record must remain recoverable');
});

test('a pending identity edit from another trip cannot overwrite a replacement committed in a different tab', () => {
  const previous = identity({ binding: accountBinding() }), store = withCurrent(previous);
  store.failCommit = true;
  assert.throws(() => writeTripIdentity(store, { ...previous, share: sharedLink() }), /quota/);
  store.failCommit = false;
  // Both tabs see one persistent store, but each has a different Storage object
  // and therefore a separate in-memory pending-edit queue.
  const otherTab = {
    getItem: key => store.entries.get(key) ?? null,
    setItem: (key, value) => store.entries.set(key, value),
  };
  const fresh = newTripIdentity();
  replaceCurrentTrip(otherTab, { ...tripValues(), [TRIP_IDENTITY_KEY]: JSON.stringify(fresh) });
  const replacement = [...store.entries];
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["food"]'), 'a stale edit must ask the old tab to reload instead of changing the replacement');
  assert.deepEqual([...store.entries], replacement);
  assert.deepEqual(readTripIdentity(store), fresh);
});

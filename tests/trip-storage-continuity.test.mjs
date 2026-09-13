import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  createTravelBookSnapshot, patchTravelBook, removeTravelBook, sanitizeTravelBook,
  sanitizeTravelBooks, travelBookRestorePayload, upsertTravelBook, TRAVEL_BOOK_STORAGE_KEY,
} from '../lib/travel-book.js';
import { replaceTripWithBackup } from '../lib/trip-import.js';
import { readTripIdentity, TRIP_IDENTITY_KEY } from '../lib/trip-identity.js';
import {
  CURRENT_TRIP_KEY, REGION_KEY, THEMES_KEY, emptyTrip, readTripValue,
  replaceCurrentTrip, writeTripValue,
} from '../lib/current-trip-storage.js';

const A = '12345678-1234-4123-8123-123456789abc';
const B = '87654321-4321-4321-9321-cba987654321';
const ACCOUNT = '11111111-2222-4333-8444-555555555555';
const EARLY = '2026-09-13T01:00:00.000Z';
const LATER = '2026-09-13T02:00:00.000Z';
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const identity = (id = A, binding = null, share = null) => ({ version: 1, id, binding, share });
const share = () => ({ id: 'a1b2c3d4e5f6', revision: 4, expiresAt: 1_800_000_000_000 });
const places = () => [
  { id: '1950218', name: '진주청동기문화박물관', city: '진주', contentTypeId: '14' },
  { id: '2796756', name: '남가람박물관', city: '진주', contentTypeId: '14' },
];
function input(patch = {}) {
  return {
    tripId: A, identity: identity(), title: '직접 만든 진주 여행', region: '진주', themes: ['history'], profiles: [],
    travelStart: '2026-10-14', travelEnd: '2026-10-15', dayStartTime: '09:30', travelMode: 'car',
    places: places(), scheduleAssignments: { '1950218': '2026-10-14', '2796756': '2026-10-15' },
    visitMinutesByPlaceId: { '1950218': 120, '2796756': 90 },
    breakMinutesByPlaceId: { '2796756': 20 }, restPurposeByPlaceId: { '2796756': 'rest' },
    ...patch,
  };
}
function storage() {
  const entries = new Map();
  return {
    entries, failKey: '',
    getItem: key => entries.get(key) ?? null,
    setItem(key, value) { if (key === this.failKey) throw new Error('quota'); entries.set(key, value); },
  };
}
function valuesFor(source) {
  return {
    ...emptyTrip(source.region, source.travelStart, source.travelEnd),
    [TRIP_IDENTITY_KEY]: JSON.stringify(source.identity),
    [THEMES_KEY]: JSON.stringify(source.themes || []),
    'wave-saved-places': JSON.stringify(source.places.map(place => place.id)),
    'wave-saved-place-catalog-v1': JSON.stringify(source.places),
    'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: source.places.map(place => place.id) }),
    'wave-trip-schedule-v1': JSON.stringify({
      travelStart: source.travelStart, travelEnd: source.travelEnd, dayStartTime: source.dayStartTime,
      travelMode: source.travelMode, scheduleAssignments: source.scheduleAssignments,
      visitMinutesByPlaceId: source.visitMinutesByPlaceId, breakMinutesByPlaceId: source.breakMinutesByPlaceId,
      restPurposeByPlaceId: source.restPurposeByPlaceId,
    }),
  };
}
function active(source = input(), books = []) {
  const store = storage();
  replaceCurrentTrip(store, valuesFor(source));
  store.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify(books));
  return store;
}
const readBooks = store => sanitizeTravelBooks(JSON.parse(store.getItem(TRAVEL_BOOK_STORAGE_KEY) || '[]'));

test('the same trip ID updates one saved item when dates, order and place count change', () => {
  const first = createTravelBookSnapshot(input(), EARLY);
  let books = upsertTravelBook([], first, EARLY);
  books = patchTravelBook(books, first.id, { note: '별도 보관 메모', status: 'visited' }, EARLY);
  const changed = createTravelBookSnapshot(input({
    title: '수정한 여행', travelStart: '2026-10-20', travelEnd: '2026-10-20',
    places: [places()[1]], scheduleAssignments: { '2796756': '2026-10-20' },
  }), LATER);
  books = upsertTravelBook(books, changed, LATER);
  assert.equal(books.length, 1);
  assert.equal(books[0].id, first.id);
  assert.equal(books[0].tripId, A);
  assert.equal(books[0].createdAt, EARLY);
  assert.equal(books[0].updatedAt, LATER);
  assert.equal(books[0].note, '별도 보관 메모');
  assert.equal(books[0].status, 'visited');
  assert.equal(books[0].travelStart, '2026-10-20');
  assert.deepEqual(books[0].places.map(place => place.id), ['2796756']);
  assert.deepEqual(books[0].visitMinutesByPlaceId, { '2796756': 90 });
});

test('distinct trip copies with identical contents have independent item IDs and edit/delete independently', () => {
  const first = createTravelBookSnapshot(input(), EARLY);
  const copy = createTravelBookSnapshot(input({ tripId: B, identity: identity(B) }), LATER);
  let books = upsertTravelBook(upsertTravelBook([], first, EARLY), copy, LATER);
  assert.equal(books.length, 2);
  assert.notEqual(books[0].id, books[1].id, 'UI operations address book.id, so copies need distinct item IDs');
  books = patchTravelBook(books, first.id, { note: '원본에만 남긴 메모' }, LATER);
  assert.equal(books.find(book => book.tripId === B).note, '');
  books = removeTravelBook(books, first.id);
  assert.deepEqual(books.map(book => book.tripId), [B]);
});

test('a legacy saved item receives its first trip identity without creating a duplicate item', () => {
  const legacy = createTravelBookSnapshot(input({ id: 'book-legacy', tripId: undefined, identity: undefined }), EARLY);
  const migrated = createTravelBookSnapshot({ ...legacy, tripId: A, identity: identity(A, { kind: 'local', id: legacy.id }) }, LATER);
  const books = upsertTravelBook([legacy], migrated, LATER);
  assert.equal(books.length, 1);
  assert.equal(books[0].id, legacy.id);
  assert.equal(books[0].tripId, A);
  assert.equal(books[0].createdAt, EARLY);
});

test('an undated itinerary can be saved and restored without inventing dates or changing transport', () => {
  const book = createTravelBookSnapshot(input({ travelStart: '', travelEnd: '', scheduleAssignments: {} }), EARLY);
  assert.ok(book);
  const restored = travelBookRestorePayload(book);
  assert.equal(restored.schedule.travelStart, '');
  assert.equal(restored.schedule.travelEnd, '');
  assert.deepEqual(restored.schedule.scheduleAssignments, { '1950218': '', '2796756': '' });
  assert.equal(restored.schedule.travelMode, 'car');
  assert.deepEqual(restored.savedPlaceIds, ['1950218', '2796756']);
  assert.deepEqual(restored.identity, identity());
});

test('opening a blank trip first backs up an undated itinerary with its ID and manual order', () => {
  const old = input({ travelStart: '', travelEnd: '', scheduleAssignments: {}, places: places().reverse() });
  const store = active(old);
  const blank = emptyTrip('', '', '');
  replaceTripWithBackup(store, blank);
  const books = readBooks(store);
  assert.equal(books.length, 1);
  assert.equal(books[0].tripId, A);
  assert.deepEqual(books[0].places.map(place => place.id), ['2796756', '1950218']);
  assert.equal(books[0].travelStart, '');
  assert.equal(books[0].travelEnd, '');
  assert.equal(readTripValue(store, REGION_KEY), '');
  assert.deepEqual(JSON.parse(readTripValue(store, 'wave-saved-places')), []);
  assert.deepEqual(readTripIdentity(store), JSON.parse(blank[TRIP_IDENTITY_KEY]));
});

test('backup and restoration preserve valid visit dates outside the selected period for explicit resolution', () => {
  const unresolved = input({ travelStart: '2026-10-15', travelEnd: '2026-10-15' });
  const store = active(unresolved);
  replaceTripWithBackup(store, emptyTrip('', '', ''));
  const restored = travelBookRestorePayload(readBooks(store)[0]);
  assert.equal(restored.schedule.travelStart, '2026-10-15');
  assert.deepEqual(restored.schedule.scheduleAssignments, unresolved.scheduleAssignments);
  assert.deepEqual(restored.schedule.visitMinutesByPlaceId, unresolved.visitMinutesByPlaceId);
  const returning = { ...unresolved, ...restored.schedule, identity: restored.identity, places: restored.savedPlaces };
  replaceTripWithBackup(store, valuesFor(returning));
  assert.equal(JSON.parse(readTripValue(store, 'wave-trip-schedule-v1')).scheduleAssignments['1950218'], '2026-10-14');
});

test('backing up a locally bound edited trip updates its existing item and keeps notes and status', () => {
  const bound = identity(A, { kind: 'local', id: 'book-bound' }, share());
  const saved = createTravelBookSnapshot(input({ id: 'book-bound', identity: bound, note: '남겨 둔 메모', status: 'visited' }), EARLY);
  const changed = input({ identity: bound, places: [places()[1]], scheduleAssignments: { '2796756': '2026-10-15' } });
  const store = active(changed, [saved]);
  replaceTripWithBackup(store, emptyTrip('', '', ''));
  const books = readBooks(store);
  assert.equal(books.length, 1);
  assert.equal(books[0].id, 'book-bound');
  assert.equal(books[0].createdAt, EARLY);
  assert.equal(books[0].note, '남겨 둔 메모');
  assert.equal(books[0].status, 'visited');
  assert.deepEqual(books[0].identity, bound);
  assert.deepEqual(books[0].places.map(place => place.id), ['2796756']);
});

test('reopening the exact same active trip does not create a redundant backup', () => {
  const source = input(), store = active(source);
  replaceTripWithBackup(store, valuesFor(source));
  assert.deepEqual(readBooks(store), []);
  assert.deepEqual(readTripIdentity(store), source.identity);
});

test('opening a distinct copy with identical dates and places still backs up the previous trip identity', () => {
  const store = active();
  replaceTripWithBackup(store, valuesFor(input({ tripId: B, identity: identity(B) })));
  assert.deepEqual(readBooks(store).map(book => book.tripId), [A]);
  assert.deepEqual(readTripIdentity(store), identity(B));
});

test('an archive quota failure leaves the entire previous current trip and archive unchanged', () => {
  const store = active(), before = [...store.entries];
  store.failKey = TRAVEL_BOOK_STORAGE_KEY;
  assert.throws(() => replaceTripWithBackup(store, emptyTrip('', '', '')), /quota/);
  assert.deepEqual([...store.entries], before);
});

test('a replacement commit failure retains the active trip and the successfully written recovery backup', () => {
  const store = active(), before = store.getItem(CURRENT_TRIP_KEY);
  store.failKey = CURRENT_TRIP_KEY;
  assert.throws(() => replaceTripWithBackup(store, emptyTrip('', '', '')), /quota/);
  assert.equal(store.getItem(CURRENT_TRIP_KEY), before);
  assert.deepEqual(readTripIdentity(store), identity());
  const books = readBooks(store);
  assert.equal(books.length, 1);
  assert.equal(books[0].tripId, A);
  assert.deepEqual(travelBookRestorePayload(books[0]).savedPlaceIds, ['1950218', '2796756']);
});

test('pending current-trip edits prevent a new trip from bypassing the recovery step', () => {
  const store = active();
  store.failKey = CURRENT_TRIP_KEY;
  assert.throws(() => writeTripValue(store, THEMES_KEY, '["nature"]'), /quota/);
  store.failKey = '';
  const before = [...store.entries];
  assert.throws(() => replaceTripWithBackup(store, emptyTrip('', '', '')), /저장하지 못한 변경/);
  assert.deepEqual([...store.entries], before);
});

test('an account-member backup preserves account revision and role while dropping injected credentials', () => {
  const binding = { kind: 'account', id: ACCOUNT, userId: 'member-user', revision: 7, role: 'member' };
  const owned = identity(A, binding, share());
  const supplied = { ...owned, token: 'private-token', binding: { ...binding, token: 'binding-secret' }, share: { ...share(), token: 'share-secret' } };
  const store = active(input({ identity: supplied }));
  replaceTripWithBackup(store, emptyTrip('', '', ''));
  const books = readBooks(store), restored = travelBookRestorePayload(books[0]);
  assert.deepEqual(restored.identity, owned);
  assert.equal(restored.identity.binding.role, 'member');
  assert.equal(restored.identity.binding.revision, 7);
  assert.doesNotMatch(store.getItem(TRAVEL_BOOK_STORAGE_KEY), /private-token|binding-secret|share-secret/);
});

test('malformed or conflicting trip identifiers cannot attach another trip identity to a restored item', () => {
  const malformed = sanitizeTravelBook(input({ tripId: '-'.repeat(36) }));
  const mismatched = sanitizeTravelBook(input({ tripId: B, identity: identity(A, { kind: 'account', id: ACCOUNT, userId: 'owner-user', revision: 2, role: 'owner' }, share()) }));
  const restored = travelBookRestorePayload(mismatched);
  assert.deepEqual({
    malformedTripIdRejected: !malformed?.tripId || uuid.test(malformed.tripId),
    restoredIdentityMatchesTrip: !restored?.identity || (restored.tripId || restored.identity.id) === restored.identity.id,
  }, { malformedTripIdRejected: true, restoredIdentityMatchesTrip: true }, 'restoration must neither accept a malformed UUID nor pair one trip ID with another trip account/share identity');
});

test('a full archive permits updating its bound trip but never evicts another trip to make a new backup', () => {
  const books = Array.from({ length: 20 }, (_, index) => {
    const id = index === 0 ? A : randomUUID();
    return createTravelBookSnapshot(input({ id: `book-${index}`, tripId: id, identity: identity(id) }), EARLY);
  });
  const matching = active(input({ identity: identity(A, { kind: 'local', id: 'book-0' }) }), books);
  replaceTripWithBackup(matching, emptyTrip('', '', ''));
  assert.equal(readBooks(matching).length, 20);
  assert.deepEqual(new Set(readBooks(matching).map(book => book.tripId)), new Set(books.map(book => book.tripId)));
  const missing = active(input({ tripId: B, identity: identity(B) }), books), before = [...missing.entries];
  assert.throws(() => replaceTripWithBackup(missing, emptyTrip('', '', '')), /여행집이 가득/);
  assert.deepEqual([...missing.entries], before);
});


test('starting another trip preserves the existing saved title, note and stable identity', () => {
  const source = input({ note: '직접 적은 메모', theme: '자연·휴양', themes: ['nature'] }); const store = storage();
  const book = createTravelBookSnapshot(source, EARLY);
  replaceCurrentTrip(store, valuesFor(source));
  store.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify([book]));
  replaceTripWithBackup(store, emptyTrip('', '', ''));
  const saved = JSON.parse(store.getItem(TRAVEL_BOOK_STORAGE_KEY));
  assert.equal(saved.length, 1); assert.equal(saved[0].title, source.title);
  assert.equal(saved[0].note, source.note); assert.equal(saved[0].theme, source.theme); assert.deepEqual(saved[0].themes, source.themes); assert.equal(saved[0].id, book.id); assert.equal(saved[0].tripId, source.tripId);
});

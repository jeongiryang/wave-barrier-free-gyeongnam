import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTravelMode } from '../lib/trip-travel-mode.js';
import { emptyTrip, readTripValue, replaceCurrentTrip, writeTripValue, CURRENT_TRIP_KEY } from '../lib/current-trip-storage.js';
import { createTravelBookSnapshot, travelBookRestorePayload } from '../lib/travel-book.js';
import { replaceTripWithBackup } from '../lib/trip-import.js';
import { accountTripPayload, bookToAccountTrip } from '../lib/account-travel/model.js';
import { publicTravelBody } from '../lib/kakao-travel.js';
import { offlineTripText } from '../lib/trip-offline.js';
import { buildTripCalendarIcs } from '../lib/trip-calendar.js';

const start = '2026-10-08', end = '2026-10-09';
const schedule = { travelStart: start, travelEnd: end, dayStartTime: '09:30', travelMode: 'car', scheduleAssignments: { '1001': end }, visitMinutesByPlaceId: { '1001': 120 } };
const bookInput = { ...schedule, region: '창원', places: [{ id: '1001', name: '미술관', city: '창원', mapX: '128.6', mapY: '35.2' }] };
function memory() { const entries = new Map(); return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) }; }

test('each supported travel mode survives archive, account and public share without route or location snapshots', () => {
  for (const travelMode of ['walk', 'bicycle', 'transit', 'car']) {
    const book = createTravelBookSnapshot({ ...bookInput, travelMode, route: { totalTime: 63, geometry: [35, 128] }, credentials: 'secret' });
    const restored = travelBookRestorePayload(book);
    assert.deepEqual(restored.schedule, { ...restored.schedule, ...schedule, travelMode });
    const account = bookToAccountTrip(book);
    assert.equal(account.travelMode, travelMode);
    assert.equal(accountTripPayload(account).travelMode, travelMode);
    assert.equal(publicTravelBody(account).selections.travelMode, travelMode);
    for (const value of [book, account, publicTravelBody(account)]) assert.doesNotMatch(JSON.stringify(value), /mapX|mapY|geometry|totalTime|credentials|secret/);
  }
});

test('legacy and invalid inputs use transit while dates, IDs and visit choices remain intact', () => {
  for (const travelMode of [undefined, null, '', 'taxi', 'CAR', ['car'], { mode: 'car', latitude: 35 }]) {
    assert.equal(sanitizeTravelMode(travelMode), 'transit');
    const book = createTravelBookSnapshot({ ...bookInput, travelMode });
    const restored = travelBookRestorePayload(book);
    assert.equal(restored.schedule.travelMode, 'transit');
    assert.equal(bookToAccountTrip(book).travelMode, 'transit');
    assert.deepEqual(restored.savedPlaceIds, ['1001']);
    assert.equal(restored.schedule.scheduleAssignments['1001'], end);
    assert.equal(restored.schedule.visitMinutesByPlaceId['1001'], 120);
  }
});

test('schedule mode commits atomically, survives unrelated writes, and backs up before replacing a trip', () => {
  const store = memory();
  replaceCurrentTrip(store, { ...emptyTrip('창원', start, end), 'wave-saved-places': '["1001"]', 'wave-saved-place-catalog-v1': JSON.stringify(bookInput.places), 'wave-trip-schedule-v1': JSON.stringify(schedule) });
  writeTripValue(store, 'wave-trip-order-v1', '{"mode":"manual","ids":["1001"]}');
  assert.deepEqual(JSON.parse(readTripValue(store, 'wave-trip-schedule-v1')), schedule);
  const old = store.getItem(CURRENT_TRIP_KEY), set = store.setItem;
  store.setItem = () => { throw Error('quota'); };
  assert.throws(() => writeTripValue(store, 'wave-trip-schedule-v1', JSON.stringify({ ...schedule, travelMode: 'bicycle' })), /quota/);
  assert.equal(store.getItem(CURRENT_TRIP_KEY), old);
  store.setItem = set;
  writeTripValue(store, 'wave-trip-order-v1', '{"mode":"manual","ids":["1001"]}');
  assert.equal(JSON.parse(readTripValue(store, 'wave-trip-schedule-v1')).travelMode, 'bicycle');
  replaceTripWithBackup(store, emptyTrip('통영', start, end));
  assert.equal(JSON.parse(store.getItem('wave-travel-book-v1'))[0].travelMode, 'bicycle');
  assert.equal(JSON.parse(readTripValue(store, 'wave-trip-schedule-v1')).travelMode, 'transit');
});

test('offline and calendar summaries identify the selected mode without preserving route responses', () => {
  assert.match(offlineTripText({ title: '여행', schedule: [], travelMode: 'car' }), /선택한 이동수단: 자동차/);
  assert.match(buildTripCalendarIcs({ ...schedule, shareUrl: 'https://wave.test/trip/saved' }).replace(/\r\n /g, ''), /선택한 이동수단: 자동차/);
  assert.match(buildTripCalendarIcs({ ...schedule, travelMode: 'bicycle', locale: 'en', shareUrl: 'https://wave.test/trip/saved' }).replace(/\r\n /g, ''), /Selected transport: Bicycle/);
});

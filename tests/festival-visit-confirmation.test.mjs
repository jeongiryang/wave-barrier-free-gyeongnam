import test from 'node:test';
import assert from 'node:assert/strict';
import { existingFestivalVisit, rescheduleFestivalVisit } from '../lib/festival-trip.js';
import { emptyTrip, replaceCurrentTrip, readTripValue, CURRENT_TRIP_KEY } from '../lib/current-trip-storage.js';

const event = { id: '3001', name: '합성 축제', city: '통영', startDate: '2026-09-20', endDate: '2026-09-25' };
function setup(fixed = {}) {
  const map = new Map();
  const storage = { fail: false, getItem: key => map.get(key) ?? null, setItem(key, value) { if (this.fail) throw new Error('quota'); map.set(key, value); } };
  const values = emptyTrip('통영', '2026-09-20', '2026-09-22');
  Object.assign(values, { 'wave-saved-places': '["1001","3001"]', 'wave-trip-order-v1': '{"mode":"manual","ids":["1001","3001"]}', 'wave-saved-place-catalog-v1': JSON.stringify([event]) });
  const schedule = JSON.parse(values['wave-trip-schedule-v1']);
  Object.assign(schedule, { scheduleAssignments: { '1001': '2026-09-20', '3001': '2026-09-20' }, fixedVisits: fixed, visitMinutesByPlaceId: { '1001': 90, '3001': 120 }, breakMinutesByPlaceId: { '1001': 25 } });
  values['wave-trip-schedule-v1'] = JSON.stringify(schedule);
  replaceCurrentTrip(storage, values);
  return storage;
}
test('reading a duplicate is immutable, and explicit confirmation changes only the visit and its day ordering', () => {
  const storage = setup(), before = storage.getItem(CURRENT_TRIP_KEY);
  const visit = existingFestivalVisit(storage, event.id);
  assert.equal(visit.date, '2026-09-20'); assert.equal(storage.getItem(CURRENT_TRIP_KEY), before);
  rescheduleFestivalVisit(storage, event, '2026-09-21', visit.revision);
  const expected = JSON.parse(before).values, schedule = JSON.parse(expected['wave-trip-schedule-v1']);
  schedule.scheduleAssignments['3001'] = '2026-09-21';
  assert.deepEqual(JSON.parse(readTripValue(storage, 'wave-trip-schedule-v1')), schedule);
  for (const key of Object.keys(expected).filter(key => !['wave-trip-schedule-v1', 'wave-trip-order-v1'].includes(key))) assert.equal(readTripValue(storage, key), expected[key]);
});
test('fixed visits, dates outside the existing period and stale confirmations do not change storage', () => {
  for (const scenario of ['fixed', 'outside', 'stale']) {
    const storage = setup(scenario === 'fixed' ? { '3001': { kind: 'visit', time: '13:00', position: 1 } } : {});
    const visit = existingFestivalVisit(storage, event.id);
    if (scenario === 'stale') { const record = JSON.parse(storage.getItem(CURRENT_TRIP_KEY)); record.values['wave-trip-themes-v1'] = '["history"]'; storage.setItem(CURRENT_TRIP_KEY, JSON.stringify(record)); }
    const before = storage.getItem(CURRENT_TRIP_KEY);
    assert.throws(() => rescheduleFestivalVisit(storage, event, scenario === 'outside' ? '2026-09-25' : '2026-09-21', visit.revision));
    assert.equal(storage.getItem(CURRENT_TRIP_KEY), before);
  }
});
test('failed confirmation commit retains the complete previous record', () => {
  const storage = setup(), visit = existingFestivalVisit(storage, event.id), before = storage.getItem(CURRENT_TRIP_KEY);
  storage.fail = true;
  assert.throws(() => rescheduleFestivalVisit(storage, event, '2026-09-21', visit.revision), /quota/);
  assert.equal(storage.getItem(CURRENT_TRIP_KEY), before);
});

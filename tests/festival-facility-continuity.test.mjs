import assert from 'node:assert/strict';
import test from 'node:test';
import { addFestivalToTrip } from '../lib/festival-trip.js';
import { emptyTrip, FACILITIES_KEY, readTripValue, replaceCurrentTrip } from '../lib/current-trip-storage.js';

const festival = { id: '3001', name: '합성 가을 축제', city: '통영', startDate: '2026-09-20', endDate: '2026-09-22' };
function storage(facilities, hasPlaces) {
  const entries = new Map();
  const store = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const values = { ...emptyTrip('통영', '2026-09-20', '2026-09-22'), [FACILITIES_KEY]: facilities };
  if (hasPlaces) values['wave-saved-places'] = '["1001"]';
  replaceCurrentTrip(store, values);
  return store;
}

for (const hasPlaces of [false, true]) {
  test(`adding a festival preserves selected facilities with ${hasPlaces ? 'existing visits' : 'an empty itinerary'}`, () => {
    const selected = '["restroom","elevator"]', store = storage(selected, hasPlaces);
    assert.equal(addFestivalToTrip(store, festival, '2026-09-21'), true);
    assert.equal(readTripValue(store, FACILITIES_KEY), selected);
  });

  test(`festival addition preserves explicit empty versus legacy unset facilities with ${hasPlaces ? 'existing visits' : 'an empty itinerary'}`, () => {
    for (const facilities of ['[]', null]) {
      const store = storage(facilities, hasPlaces);
      addFestivalToTrip(store, festival, '2026-09-21');
      assert.equal(readTripValue(store, FACILITIES_KEY), facilities, 'Unset facilities must still allow the planner to recover the tab selection.');
    }
  });
}

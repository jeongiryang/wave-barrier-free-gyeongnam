import assert from 'node:assert/strict';
import test from 'node:test';
import { restroomTemporaryStop, sanitizeTemporaryRestroomStops } from '../lib/restroom-temporary-stop.js';
import { liveSharePayload } from '../lib/trips/live-share.js';
import { sanitizeSavedPlaceCatalog, resolveSavedPlaces } from '../lib/saved-place-catalog.js';

const restroom = { id: 'OFFICIAL-1', name: '중앙 화장실', address: '경상남도 창원시 중앙대로 1', distanceFromPlaceMeters: 100, openingHours: '09:00–18:00', evidence: { accessibleToilet: 'confirmed', entranceStep: 'unknown', entranceDoor: 'unknown', grabBars: 'unknown', turningSpace: 'unknown', sinkAccess: 'unknown', elevatorRequired: 'unknown', emergencyBell: 'unknown' }, sources: [{ type: 'official', provider: '행정안전부', referenceDate: '2026-09-13' }], destination: { latitude: 35.2, longitude: 128.6 } };

test('official restroom uses one explicit temporary-stop adapter accepted by the command ID boundary', () => {
  const place = restroomTemporaryStop(restroom);
  assert.match(place.id, /^[1-9]\d{0,11}$/);
  assert.equal(place.temporaryStop.kind, 'official-restroom');
  assert.equal(place.temporaryStop.evidence.entranceStep, 'unknown');
});

test('public share keeps only allowlisted official temporary-stop evidence and destination', () => {
  const place = restroomTemporaryStop(restroom);
  const body = { selections: { region: '창원', themes: [], travelStart: '2026-09-15', travelEnd: '2026-09-15', selectedPlaceIds: [place.id], scheduleAssignments: { [place.id]: '2026-09-15' }, temporaryStops: [{ ...place, privateOrigin: { latitude: 35.12345678, longitude: 128.87654321 } }] } };
  const shared = liveSharePayload(body), serialized = JSON.stringify(shared);
  assert.deepEqual(shared.selections.temporaryStops, sanitizeTemporaryRestroomStops([place]));
  assert.doesNotMatch(serialized, /privateOrigin|35\.12345678|128\.87654321/);
  assert.equal(shared.selections.temporaryStops[0].temporaryStop.evidence.entranceStep, 'unknown');
});

test('temporary restroom source, reference date, unknown evidence and destination survive offline catalog serialization', () => {
  const place = restroomTemporaryStop(restroom), catalog = sanitizeSavedPlaceCatalog([place]);
  const restored = resolveSavedPlaces([place.id], [], JSON.parse(JSON.stringify(catalog)))[0];
  assert.deepEqual(restored.temporaryStop, place.temporaryStop);
  assert.equal(restored.mapX, String(restroom.destination.longitude));
  assert.equal(restored.source, '행정안전부 · 기준일 2026-09-13');
  assert.doesNotMatch(JSON.stringify(restored), /current|accuracy|origin/i);
});

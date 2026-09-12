import assert from 'node:assert/strict';
import test from 'node:test';
import { journeyDays, journeyOutcome, selectJourneyStops, validateJourneyApplication } from '../lib/naru-journey.js';
import { validateAssistantAction } from '../lib/assistant-actions.js';

const start = '2026-09-20';
const days = journeyDays(start, '2026-09-22');
const place = (id, patch = {}) => ({
  id, name: `합성 검증 장소 ${id}`, city: '창원', contentTypeId: '14',
  mapX: '128.681', mapY: '35.228', source: '검증 fixture',
  knownFields: 1, unknownFields: 0,
  accessibility: [{ key: 'wheelchair', label: '휠체어 대여', state: 'confirmed', detail: '대여 가능' }],
  ...patch,
});
const stop = (id, patch = {}) => ({ place: place(id), date: start, minutes: 60, breakMinutes: 20, reasons: [], unknown: [], ...patch });
const draft = (stops, patch = {}) => ({ start, end: days.at(-1), stops, ...patch });
const state = (patch = {}) => ({ saved: [], fixed: {}, assignments: {}, start, ...patch });
const existing = (id, date = start, fixed = false) => ({ id, date, fixed, place: place(id) });
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('journey dates handle leap days and year boundaries without exceeding seven days', () => {
  assert.deepEqual(journeyDays('2028-02-28', '2028-03-01'), ['2028-02-28', '2028-02-29', '2028-03-01']);
  assert.deepEqual(journeyDays('2026-12-31', '2027-01-02'), ['2026-12-31', '2027-01-01', '2027-01-02']);
  assert.equal(journeyDays(start, '2026-09-26').length, 7);
  for (const [from, to] of [[start, '2026-09-27'], [start, '2026-09-19'], ['2026-02-29', '2026-03-01'], [[start], start], [start, null]]) {
    assert.deepEqual(journeyDays(from, to), []);
  }
});

test('journey action schema accepts bounded intents without accepting model-supplied venues or URLs', () => {
  assert.deepEqual(validateAssistantAction({ action: 'create-itinerary', start, profiles: ['wheel', 'wheel'], transport: 'walk', placeIds: ['9999'], url: 'https://untrusted.example' }), {
    action: 'create-itinerary', profiles: ['wheel'], start, end: start, transport: 'walk',
  });
  assert.deepEqual(validateAssistantAction({ action: 'adapt-itinerary', date: days[1], reason: 'rain', indoor: true }), {
    action: 'adapt-itinerary', date: days[1], indoor: true, reason: 'rain',
  });
  for (const patch of [{ start: [start] }, { start, end: [start] }, { start, end: '2026-09-27' }, { date: { toString: () => start } }, { indoor: 'true' }, { transport: 'taxi' }, { originRegion: '경남 전체' }, { profiles: [] }, { profiles: ['wheelchair'] }, { festival: 'x'.repeat(101) }]) {
    assert.equal(validateAssistantAction({ action: 'create-itinerary', ...patch }), null);
  }
});

test('selection excludes existing IDs, duplicates, negative facilities and unsupported coordinates without mutating inputs', () => {
  const input = freeze({
    places: [place('1001'), place('1002'), place('1002'), place('1003', { accessibility: [{ key: 'wheelchair', label: '휠체어 대여', state: 'negative', detail: '대여 불가' }] }), place('1004', { mapX: '', mapY: '' })],
    days: [start], profiles: ['wheel'], existing: [existing('1001')],
  });
  const before = JSON.stringify(input);
  assert.deepEqual(selectJourneyStops(input).map(item => item.place.id), ['1002']);
  assert.equal(JSON.stringify(input), before);
});

test('unconfirmed requested facilities remain explicit on the proposed stop', () => {
  const candidate = place('1001', { knownFields: 0, unknownFields: 1, accessibility: [{ key: 'wheelchair', label: '휠체어 대여', state: 'unknown', detail: '' }] });
  const [selected] = selectJourneyStops({ places: [candidate], days: [start], profiles: ['wheel'] });
  assert.deepEqual(selected.unknown, ['휠체어 대여']);
  assert.ok(selected.reasons.includes('편의시설 원문 확인 필요'));
  assert.ok(!selected.reasons.some(reason => reason.includes('대여 정보 확인')));
});

test('indoor adaptation requires source evidence and preserves fixed and already-indoor visits', () => {
  const selected = selectJourneyStops({
    places: [place('2001'), place('2002', { name: '이름만 실내 박물관' })], days, profiles: ['wheel'], indoor: true, replace: true, targetDay: days[1],
    existing: [existing('1001', days[0]), existing('1002', days[1], true), existing('1003', days[1]), existing('1004', days[1])],
    indoorById: { '2001': { state: 'indoor-space' }, '1003': { state: 'indoor-space' } },
  });
  assert.deepEqual(selected.map(item => [item.place.id, item.date, item.replaces]), [['2001', days[1], '1004']]);
});

test('already-indoor adaptation returns a typed read-only outcome with the existing visits', () => {
  const input = freeze({ action: 'adapt-itinerary', indoor: true, existing: [existing('1001'), existing('1002', days[1], true)],
    indoorById: { '1001': { state: 'indoor-space' }, '1002': { state: 'indoor-space' } } });
  const before = JSON.stringify(input);
  const outcome = journeyOutcome(input);
  assert.deepEqual(outcome, { kind: 'unchanged', reason: 'already-indoor', kept: [
    { id: '1001', name: '합성 검증 장소 1001', date: start }, { id: '1002', name: '합성 검증 장소 1002', date: days[1] },
  ] });
  assert.equal(JSON.stringify(input), before);
  assert.ok(validateJourneyApplication(draft([], { outcome }), state({ saved: ['1001', '1002'] })));
  assert.ok(validateJourneyApplication(draft([stop('2001')], { outcome }), state()), 'Even a contradictory payload cannot apply an unchanged result.');
});

test('empty searches, provider failures, missing indoor evidence and other changes cannot become no-change success', () => {
  const base = { action: 'adapt-itinerary', indoor: true, existing: [existing('1001')], indoorById: { '1001': { state: 'indoor-space' } } };
  for (const patch of [{ action: 'create-itinerary' }, { existing: [] }, { indoor: false }, { providerFailed: true }, { conditionsChanged: true },
    { indoorById: {} }, { indoorById: { '1001': { state: 'unknown' } } }, { existing: [{ id: '1001', date: start }] },
    { existing: [existing('1001', 'invalid')] }, { existing: [{ ...existing('1001'), place: place('9999') }] }]) {
    assert.deepEqual(journeyOutcome({ ...base, ...patch }), { kind: 'unavailable' });
  }
  assert.deepEqual(journeyOutcome({ ...base, stops: [stop('2001')] }), { kind: 'proposal' });
  assert.deepEqual(journeyOutcome({ ...base, restOnly: true }), { kind: 'proposal' });
});

test('a relaxed walking proposal cannot add a candidate far from an existing visit', () => {
  const selected = selectJourneyStops({ places: [place('2001'), place('2002', { mapX: '128.90' })], days: [start], existing: [existing('1001')], transport: 'walk', relaxed: true });
  assert.deepEqual(selected.map(item => item.place.id), ['2001']);
  assert.equal(selected[0].breakMinutes, 20);
});

test('adding stops respects the twelve-place trip capacity across all days', () => {
  const selected = selectJourneyStops({
    places: Array.from({ length: 15 }, (_, index) => place(String(2001 + index))), days,
    existing: Array.from({ length: 11 }, (_, index) => existing(String(1001 + index))),
  });
  assert.equal(selected.length, 1);
  assert.equal(new Set(selected.map(item => item.place.id)).size, selected.length);
});

test('full twelve-place itineraries can replace eligible visits on every requested day', () => {
  const previous = Array.from({ length: 12 }, (_, index) => existing(String(1001 + index), days[Math.floor(index / 4)]));
  const selected = selectJourneyStops({ places: Array.from({ length: 12 }, (_, index) => place(String(2001 + index))), days, existing: previous, replace: true });
  assert.equal(selected.length, 12, 'Replacing a visit does not consume an extra slot, including after the first day.');
  assert.deepEqual(new Set(selected.map(item => item.replaces)), new Set(previous.map(item => item.id)));
  assert.equal(validateJourneyApplication(draft(selected), state({ saved: previous.map(item => item.id), assignments: Object.fromEntries(previous.map(item => [item.id, item.date])) })), '');
});

test('festival anchors are assigned only to a day on which the festival actually runs', () => {
  const festival = place('2001', { contentTypeId: '15', startDate: days[2], endDate: days[2] });
  const selected = selectJourneyStops({ places: [festival], days, anchorId: festival.id });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].date, days[2]);
});

test('festivals outside the requested travel dates are never scheduled', () => {
  const festival = place('2001', { contentTypeId: '15', startDate: '2026-09-23', endDate: '2026-09-24' });
  assert.deepEqual(selectJourneyStops({ places: [festival], days, anchorId: festival.id }), []);
});

test('a fixed-only day and a date outside the trip produce no replacement or implicit additions', () => {
  assert.deepEqual(selectJourneyStops({ places: [place('2001')], days, existing: [existing('1001', start, true)], replace: true }), []);
  assert.deepEqual(selectJourneyStops({ places: [place('2001')], days, targetDay: '2026-09-30' }), []);
});

test('application validation accepts a legal replacement without changing the draft or current state', () => {
  const proposal = freeze(draft([stop('2001', { replaces: '1001' })]));
  const current = freeze(state({ saved: ['1001', '1002'], assignments: { '1001': start, '1002': days[1] }, fixed: { '1002': { time: '14:00' } } }));
  const before = JSON.stringify([proposal, current]);
  assert.equal(validateJourneyApplication(proposal, current), '');
  assert.equal(JSON.stringify([proposal, current]), before);
});

test('application rechecks whether a replacement was removed, moved or fixed after preparation', () => {
  const proposal = draft([stop('2001', { replaces: '1001' })]);
  for (const current of [state(), state({ saved: ['1001'], assignments: { '1001': days[1] } }), state({ saved: ['1001'], fixed: { '1001': { time: '10:00' } } })]) {
    assert.ok(validateJourneyApplication(proposal, current));
  }
});

test('application rejects duplicate additions, duplicate replacements and venues already saved after preparation', () => {
  assert.ok(validateJourneyApplication(draft([stop('2001'), stop('2001')]), state()));
  assert.ok(validateJourneyApplication(draft([stop('2001', { replaces: '1001' }), stop('2002', { replaces: '1001' })]), state({ saved: ['1001'] })));
  assert.ok(validateJourneyApplication(draft([stop('2001')]), state({ saved: ['2001'] })));
});

test('application preserves original dates and rejects invalid durations or trips over capacity', () => {
  assert.ok(validateJourneyApplication(draft([stop('2001')]), state({ saved: ['1001'], assignments: { '1001': '2026-09-19' } })));
  assert.ok(validateJourneyApplication(draft([stop('2001')]), state({ saved: Array.from({ length: 12 }, (_, index) => String(1001 + index)) })));
  for (const patch of [{ date: '2026-09-23' }, { date: [start] }, { minutes: 14 }, { minutes: 721 }, { minutes: '60' }, { breakMinutes: -1 }, { breakMinutes: 181 }, { breakMinutes: 20.5 }]) {
    assert.ok(validateJourneyApplication(draft([stop('2001', patch)]), state()));
  }
});

test('application venue identities must be strings, not values that coerce to a saved ID', () => {
  for (const id of [2001, ['2001'], { toString: () => '2001' }]) {
    assert.ok(validateJourneyApplication(draft([stop('2001', { place: place(id) })]), state({ saved: ['2001'] })), 'Coercion must not bypass the duplicate-place check.');
  }
});

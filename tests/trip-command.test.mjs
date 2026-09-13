import assert from 'node:assert/strict';
import test from 'node:test';
import { planTripCommand } from '../lib/trip-command.js';
import { canUndoVoiceEdit, voiceStateKey } from '../lib/voice-edit.js';

const d1 = '2026-09-20', d2 = '2026-09-21', d3 = '2026-09-22';
const places = [
  { id: '1001', name: '첫 박물관' }, { id: '1002', name: '둘째 전시관' },
  { id: '1003', name: '고정 공연장' }, { id: '1004', name: '새 정원' },
  { id: '1005', name: '다섯째 장소' },
];
function state(overrides = {}) {
  return {
    saved: ['1001', '1002', '1003'], order: ['1001', '1002', '1003'],
    mode: 'auto', manualOrder: ['1002', '1001', '1003'],
    days: [d1, d2], activeDay: d1,
    assignments: { 1001: d1, 1002: d1, 1003: d2 },
    visits: { 1002: 45 }, breaks: { 1002: 15 }, purposes: { 1002: 'rest' },
    fixed: { 1003: { kind: 'event', position: 0, time: '14:00' } },
    deadlines: { [d2]: { time: '18:00', bufferMinutes: 20, returnMinutes: 30 } },
    comfort: { maxWalkMinutes: 20, breakEveryMinutes: 90, breakMinutes: 30 },
    startTime: '10:00', travelMode: 'transit', ...overrides,
  };
}
const undated = (overrides = {}) => state({
  saved: [], order: [], manualOrder: [], days: [], activeDay: '', assignments: {},
  visits: {}, breaks: {}, purposes: {}, fixed: {}, deadlines: {}, ...overrides,
});
function accepted(before, command, available = places) {
  const original = structuredClone(before), action = structuredClone(command);
  const result = planTripCommand(before, command, available);
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(before, original, 'planning must not mutate the current trip');
  assert.deepEqual(command, action, 'planning must not mutate the request');
  assert.deepEqual(result.before, original);
  assert.equal(result.beforeKey, voiceStateKey(original));
  assert.equal(result.afterKey, voiceStateKey(result.after));
  assert.notEqual(result.afterKey, result.beforeKey);
  assert.equal(canUndoVoiceEdit(result.after, result), true);
  return result;
}
function rejected(before, command, available = places) {
  const original = structuredClone(before);
  const result = planTripCommand(before, command, available);
  assert.equal(result.ok, false, `unexpected successful edit: ${JSON.stringify(command)}`);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0);
  assert.deepEqual(before, original);
  assert.equal('after' in result, false);
}

test('a known place can be added to an undated draft without inventing dates or assignments', () => {
  const result = accepted(undated(), { type: 'add', id: '1001' });
  assert.deepEqual(result.after.saved, ['1001']);
  assert.deepEqual(result.after.days, []);
  assert.deepEqual(result.after.assignments, {});
  assert.equal(result.after.activeDay, '');
  rejected(result.after, { type: 'add', id: '1001' });
});

test('an undated saved place can receive visit and rest choices and be removed with an exact undo receipt', () => {
  const add = accepted(undated(), { type: 'add', id: '1001' });
  const edit = accepted(add.after, { type: 'stop', id: '1001', minutes: 60, breakMinutes: 15, purpose: 'rest' });
  assert.deepEqual(edit.after.assignments, {});
  assert.deepEqual(edit.after.days, []);
  const remove = accepted(edit.after, { type: 'remove', id: '1001' });
  for (const name of ['saved', 'order']) assert.deepEqual(remove.after[name], []);
  for (const name of ['assignments', 'visits', 'breaks', 'purposes']) assert.deepEqual(remove.after[name], {});
  assert.equal(remove.before.visits['1001'], 60);
  assert.equal(remove.before.breaks['1001'], 15);
  assert.equal(remove.before.purposes['1001'], 'rest');
});

test('first date assignment covers every undated saved place inside the chosen period without changing their order', () => {
  const ids = places.map(item => item.id);
  const before = undated({ saved: ids, order: ids, manualOrder: [...ids] });
  const result = accepted(before, { type: 'schedule', start: d1, end: d2, startTime: '09:30', transport: 'car' });
  assert.deepEqual(result.after.days, [d1, d2]);
  assert.deepEqual(result.after.order, ids);
  assert.deepEqual(result.after.saved, ids);
  assert.equal(result.after.activeDay, d1);
  assert.equal(result.after.startTime, '09:30');
  assert.equal(result.after.travelMode, 'car');
  assert.deepEqual(Object.keys(result.after.assignments).sort(), [...ids].sort());
  const assigned = Object.values(result.after.assignments);
  assert.ok(assigned.every(day => [d1, d2].includes(day)));
  assert.equal(new Set(assigned).size, 2, 'initial assignment should use both selected days');
});

test('first date assignment preserves existing explicit dates and pinned visits instead of redistributing them', () => {
  const before = undated({ saved: ['1001', '1002', '1003'], order: ['1001', '1002', '1003'],
    assignments: { 1002: d3, 1003: d2 }, fixed: { 1003: { kind: 'event', position: 0, time: '14:00' } } });
  const result = accepted(before, { type: 'schedule', start: d1, end: d2 });
  assert.equal(result.after.assignments['1002'], d3);
  assert.equal(result.after.assignments['1003'], d2);
  assert.ok([d1, d2].includes(result.after.assignments['1001']));
  assert.deepEqual(result.after.fixed, before.fixed);
});

test('later period changes preserve manual dates outside the new period, pins and the old implicit first-day assignment', () => {
  const before = state({ assignments: { 1002: d2, 1003: d2 } });
  const result = accepted(before, { type: 'schedule', start: d3, end: d3 });
  assert.deepEqual(result.after.days, [d3]);
  assert.deepEqual(result.after.assignments, { 1001: d1, 1002: d2, 1003: d2 });
  assert.deepEqual(result.after.fixed, before.fixed);
  assert.deepEqual(result.after.deadlines, before.deadlines);
  assert.deepEqual(result.after.visits, before.visits);
  assert.deepEqual(result.after.breaks, before.breaks);
});

for (const command of [{ type: 'schedule', transport: 'car' }, { type: 'schedule', startTime: '11:00' }]) {
  test(`an undated draft can change ${command.transport ? 'transport' : 'start time'} without forcing a date`, () => {
    const result = accepted(undated(), command);
    assert.deepEqual(result.after.days, []);
    assert.deepEqual(result.after.assignments, {});
    assert.equal(result.after.activeDay, '');
    assert.equal(command.transport ? result.after.travelMode : result.after.startTime, command.transport || command.startTime);
  });
}

test('a dated addition joins only the selected day while keeping other visits and constraints', () => {
  const before = state();
  const result = accepted(before, { type: 'add', id: '1004', day: d1 });
  assert.equal(result.after.assignments['1004'], d1);
  assert.deepEqual(result.after.order.filter(id => id !== '1004'), before.order);
  assert.deepEqual(result.after.fixed, before.fixed);
  assert.deepEqual(result.after.visits, before.visits);
  assert.deepEqual(result.after.deadlines, before.deadlines);
  assert.deepEqual(result.after.order.filter(id => result.after.assignments[id] === d1), ['1001', '1002', '1004']);
});

test('a targeted visit edit preserves dates, other stops and the inactive original order in its undo receipt', () => {
  const before = state();
  const result = accepted(before, { type: 'stop', id: '1002', minutes: 60, breakMinutes: 20, purpose: 'restroom' });
  assert.equal(result.after.visits['1002'], 60);
  assert.equal(result.after.breaks['1002'], 20);
  assert.equal(result.after.purposes['1002'], 'restroom');
  assert.deepEqual(result.after.assignments, before.assignments);
  assert.deepEqual(result.after.fixed, before.fixed);
  assert.deepEqual(result.before.manualOrder, ['1002', '1001', '1003']);
  assert.equal(result.before.mode, 'auto');
  rejected(result.after, { type: 'stop', id: '1002', minutes: 60, breakMinutes: 20, purpose: 'restroom' });
});

test('null explicitly clears a visit override without deleting other visits or inventing a zero duration', () => {
  const result = accepted(state(), { type: 'stop', id: '1002', minutes: null, breakMinutes: null, purpose: null });
  assert.equal('1002' in result.after.visits, false);
  assert.equal('1002' in result.after.breaks, false);
  assert.equal('1002' in result.after.purposes, false);
  assert.deepEqual(result.after.saved, ['1001', '1002', '1003']);
});

test('zero explicitly removes a rest override and a new fixed visit records its real daily slot and time', () => {
  const before = state();
  const clear = accepted(before, { type: 'stop', id: '1002', breakMinutes: 0 });
  assert.equal('1002' in clear.after.breaks, false);
  assert.equal(clear.after.visits['1002'], 45);
  const pin = { kind: 'visit', position: 1, time: '12:30' };
  const result = accepted(before, { type: 'stop', id: '1002', fixed: pin });
  assert.deepEqual(result.after.fixed['1002'], pin);
  assert.deepEqual(result.after.fixed['1003'], before.fixed['1003']);
  assert.deepEqual(result.after.assignments, before.assignments);
});

test('moving a free visit to another day appends it after that day’s existing visit and keeps the pin', () => {
  const before = state();
  const result = accepted(before, { type: 'stop', id: '1002', day: d2 });
  assert.deepEqual(result.after.order, ['1001', '1003', '1002']);
  assert.equal(result.after.assignments['1002'], d2);
  assert.deepEqual(result.after.fixed, before.fixed);
  assert.equal(result.after.visits['1002'], before.visits['1002']);
});

test('a pinned visit cannot change day unless that exact command explicitly removes its pin', () => {
  rejected(state(), { type: 'stop', id: '1003', day: d1 });
  const result = accepted(state(), { type: 'stop', id: '1003', day: d1, fixed: null });
  assert.equal(result.after.assignments['1003'], d1);
  assert.deepEqual(result.after.fixed, {});
  assert.equal(result.before.fixed['1003'].time, '14:00');
});

test('moving a preceding visit away cannot silently shift a later pinned daily slot', () => {
  const before = state({ fixed: { 1002: { kind: 'event', position: 1, time: '14:00' } } });
  rejected(before, { type: 'stop', id: '1001', day: d2 });
});

test('up/down moves operate within one date and refuse crossing a pin or the day boundary', () => {
  const before = state();
  const result = accepted(before, { type: 'move', id: '1001', direction: 'down' });
  assert.deepEqual(result.after.order, ['1002', '1001', '1003']);
  assert.deepEqual(result.after.assignments, before.assignments);
  assert.deepEqual(result.after.fixed, before.fixed);
  rejected(before, { type: 'move', id: '1002', direction: 'down' });
  rejected(before, { type: 'move', id: '1003', direction: 'up' });
  rejected(state({ fixed: { 1002: { kind: 'visit', position: 1, time: '' } } }), { type: 'move', id: '1001', direction: 'down' });
});

test('remove clears only the removed stop’s maps and refuses pinned or pre-pin removals', () => {
  const before = state();
  const result = accepted(before, { type: 'remove', id: '1002' });
  assert.deepEqual(result.after.saved, ['1001', '1003']);
  assert.deepEqual(result.after.order, ['1001', '1003']);
  for (const name of ['assignments', 'visits', 'breaks', 'purposes', 'fixed']) assert.equal('1002' in result.after[name], false);
  assert.deepEqual(result.after.fixed, before.fixed);
  assert.deepEqual(result.after.deadlines, before.deadlines);
  rejected(before, { type: 'remove', id: '1003' });
  rejected(state({ fixed: { 1002: { kind: 'visit', position: 1, time: '' } } }), { type: 'remove', id: '1001' });
  rejected(result.after, { type: 'remove', id: '1002' });
});

test('an addition cannot resurrect an orphan pin silently', () => {
  rejected(state({ fixed: { 1004: { kind: 'event', position: 0, time: '12:00' } } }), { type: 'add', id: '1004', day: d1 });
});

test('an addition cannot overwrite an older explicit out-of-period assignment silently', () => {
  rejected(state({ assignments: { 1001: d1, 1002: d1, 1003: d2, 1004: d3 } }), { type: 'add', id: '1004', day: d1 });
});

test('comfort changes keep unmentioned limits and refuse a repeated identical command', () => {
  const before = state();
  const result = accepted(before, { type: 'comfort', value: { maxWalkMinutes: 10 } });
  assert.deepEqual(result.after.comfort, { maxWalkMinutes: 10, breakEveryMinutes: 90, breakMinutes: 30 });
  assert.deepEqual(result.after.assignments, before.assignments);
  assert.deepEqual(result.after.fixed, before.fixed);
  rejected(result.after, { type: 'comfort', value: { maxWalkMinutes: 10 } });
});

for (const value of [{ maxWalkMinutes: '20' }, { maxWalkMinutes: -1 }, { breakEveryMinutes: false }, { breakMinutes: 999 }]) {
  test(`invalid comfort ${JSON.stringify(value)} cannot clear a current limit or replace it with a default`, () => {
    rejected(state(), { type: 'comfort', value });
  });
}

test('deadline edits and explicit clearing affect exactly one valid date', () => {
  const before = state();
  const value = { time: '17:30', returnMinutes: null, bufferMinutes: 15 };
  const result = accepted(before, { type: 'deadline', day: d1, value });
  assert.deepEqual(result.after.deadlines[d1], value);
  assert.deepEqual(result.after.deadlines[d2], before.deadlines[d2]);
  rejected(result.after, { type: 'deadline', day: d1, value });
  const clear = accepted(result.after, { type: 'deadline', day: d1, value: null });
  assert.equal(d1 in clear.after.deadlines, false);
  assert.deepEqual(clear.after.deadlines[d2], before.deadlines[d2]);
});

test('commands already equal to an automatic trip do not erase its inactive manual order just to report a change', () => {
  const before = state();
  for (const command of [
    { type: 'stop', id: '1002', minutes: 45 },
    { type: 'schedule', start: d1, end: d2, startTime: '10:00', transport: 'transit' },
    { type: 'comfort', value: { maxWalkMinutes: 20 } },
    { type: 'deadline', day: d2, value: before.deadlines[d2] },
  ]) rejected(before, command);
});

test('invalid identity, incomplete saved-place loading and the twelve-place bound fail without mutation', () => {
  rejected(state(), { type: 'add', id: '9999' });
  rejected(state(), { type: 'add', id: 'javascript:1' }, [{ id: 'javascript:1', name: 'not a tourism ID' }]);
  rejected(state(), { type: 'remove', id: '9999' });
  rejected(state({ order: ['1001'] }), { type: 'stop', id: '1001', minutes: 60 });
  rejected(state({ saved: ['1001', '1001'], order: ['1001', '1001'] }), { type: 'add', id: '1004' });
  const ids = Array.from({ length: 12 }, (_, index) => String(index + 2000));
  rejected(state({ saved: ids, order: ids }), { type: 'add', id: '1004', day: d1 });
});

test('malformed dates, times, durations, direction and purpose do not produce an apply receipt', () => {
  const commands = [
    { type: 'add', id: '1004', day: d3 }, { type: 'add', id: '1004', day: '' },
    { type: 'stop', id: '1002', day: d3 }, { type: 'stop', id: '1002', minutes: '60' },
    { type: 'stop', id: '1002', minutes: 14 }, { type: 'stop', id: '1002', minutes: 721 },
    { type: 'stop', id: '1002', breakMinutes: -1 }, { type: 'stop', id: '1002', breakMinutes: 181 },
    { type: 'stop', id: '1002', breakMinutes: 4 }, { type: 'stop', id: '1002', breakMinutes: 121 },
    { type: 'stop', id: '1002', purpose: 'anywhere' }, { type: 'stop', id: '1002', fixed: { kind: 'visit', position: -1 } },
    { type: 'move', id: '1002', direction: 'first' },
    { type: 'schedule', start: '2026-02-30', end: '2026-03-01' },
    { type: 'schedule', start: d1, end: '2026-09-27' }, { type: 'schedule', start: [d1], end: d1 },
    { type: 'schedule', startTime: ['11:00'] }, { type: 'schedule', startTime: '24:00' },
    { type: 'schedule', transport: 'plane' }, { type: 'deadline', day: d3, value: null },
    { type: 'deadline', day: d1, value: { time: '25:00', returnMinutes: null, bufferMinutes: 15 } },
    { type: 'delete-all' }, null,
  ];
  for (const command of commands) rejected(state(), command);
});

test('a receipt restores the exact prior trip and cannot authorize undo over any newer manual change', () => {
  const before = state();
  const result = accepted(before, { type: 'stop', id: '1002', minutes: 75 });
  assert.deepEqual(structuredClone(result.before), before);
  assert.equal(canUndoVoiceEdit({ ...result.after, activeDay: d2 }, result), true, 'viewing another day is not a trip mutation');
  for (const change of [
    { travelMode: 'car' }, { startTime: '11:00' },
    { manualOrder: ['1003', '1002', '1001'] }, { visits: { 1002: 90 } },
    { assignments: { 1001: d2, 1002: d1, 1003: d2 } },
    { breaks: { 1002: 30 } }, { comfort: { maxWalkMinutes: 5, breakEveryMinutes: 60, breakMinutes: 20 } },
  ]) assert.equal(canUndoVoiceEdit({ ...result.after, ...change }, result), false);
});

test('planning a change works with frozen state and does not mutate retained nested constraints', () => {
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const before = freeze(state());
  const command = freeze({ type: 'stop', id: '1002', minutes: 60 });
  const result = accepted(before, command);
  assert.equal(result.after.visits['1002'], 60);
  assert.equal(before.visits['1002'], 45);
  assert.deepEqual(result.after.fixed, before.fixed);
});


test('an explicit replacement preserves its date, position, stay and rest without changing fixed visits', () => {
  const before = state(), result = accepted(before, { type: 'replace', previousId: '1002', id: '1004' });
  assert.deepEqual(result.after.order, ['1001', '1004', '1003']);
  assert.equal(result.after.assignments['1004'], d1);
  assert.equal(result.after.visits['1004'], 45);
  assert.equal(result.after.breaks['1004'], 15);
  assert.equal(result.after.purposes['1004'], 'rest');
  assert.deepEqual(result.after.fixed, before.fixed);
  for (const field of ['assignments', 'visits', 'breaks', 'purposes']) assert.equal(Object.hasOwn(result.after[field], '1002'), false);
  rejected(before, { type: 'replace', previousId: '1003', id: '1004' });
  rejected(before, { type: 'replace', previousId: '1002', id: '1001' });
  rejected(before, { type: 'replace', previousId: '1002', id: '99999' });
});

test('course insertion uses the named same-day anchor and cannot displace a later fixed appointment', () => {
  const result = accepted(state(), { type: 'add', id: '1004', afterId: '1001', day: d1 });
  assert.deepEqual(result.after.order, ['1001', '1004', '1002', '1003']);
  assert.equal(result.after.assignments['1004'], d1);
  rejected(state(), { type: 'add', id: '1004', afterId: '1003', day: d1 });
  rejected(state({ assignments: { 1001: d1, 1002: d1, 1003: d1 } }), { type: 'add', id: '1004', afterId: '1001', day: d1 });
  const datedLater = accepted(undated({ saved: ['1001'], order: ['1001'] }), { type: 'add', id: '1004', afterId: '1001' });
  assert.deepEqual(datedLater.after.assignments, {});
});

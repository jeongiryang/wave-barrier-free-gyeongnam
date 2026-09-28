import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoSchedule, demoScenarios, formatDemoTime } from '../features/demo/schedule.ts';

test('demo scenarios contain visitor planning fields and no invented provider response', () => {
  assert.ok(demoScenarios.length >= 5);
  for (const scenario of demoScenarios) {
    assert.ok(scenario.stops.length >= 3);
    for (const stop of scenario.stops) {
      assert.match(stop.label, /방문지/);
      for (const key of ['contentId', 'contentTypeId', 'address', 'latitude', 'longitude', 'facilities', 'routeMinutes', 'weather', 'openingHours']) {
        assert.equal(Object.hasOwn(stop, key), false, `${scenario.title}: ${key}`);
      }
    }
  }
});

test('late and empty-day examples expose planning limits without route data', () => {
  const late = demoScenarios[3];
  assert.match(formatDemoTime(buildDemoSchedule(late.stops, late.days, late.startTime)[0].entries.at(-1).end), /^\+1일 /);
  const split = demoScenarios[4];
  assert.equal(buildDemoSchedule(split.stops, split.days, split.startTime)[1].entries.length, 0);
});

test('schedule uses only visitor visit and rest time, preserving an explicit fixed time', () => {
  const scenario = demoScenarios[2];
  const first = buildDemoSchedule(scenario.stops, scenario.days, scenario.startTime)[0].entries;
  assert.equal(formatDemoTime(first[0].end), '12:00');
  assert.equal(first[1].fixedConflict, false);
  const longer = scenario.stops.map((stop) => stop.id === 'a' ? { ...stop, visitMinutes: 120 } : stop);
  const changed = buildDemoSchedule(longer, scenario.days, scenario.startTime)[0].entries;
  assert.equal(changed[1].fixedConflict, true);
  assert.equal(formatDemoTime(changed[1].start), '12:30');
});

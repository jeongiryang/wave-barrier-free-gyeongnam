import test from 'node:test';
import assert from 'node:assert/strict';
import { NARU_HUB_ITEMS, visibleNaruHubItems } from '../lib/naru-hub.js';
import { ASSISTANT_TOOLS } from '../lib/assistant-actions.js';

test('every naru hub item points at a tool that already exists in ASSISTANT_TOOLS', () => {
  for (const item of NARU_HUB_ITEMS) assert.ok(ASSISTANT_TOOLS.includes(item.tool), `${item.id} references unknown tool ${item.tool}`);
});

test('the "always" item shows even before trip state is known', () => {
  const context = { hasItinerary: false, isTripDay: false, hasFocusedPlace: false, hasSavedTrip: false };
  const visible = visibleNaruHubItems(NARU_HUB_ITEMS, context, 6);
  assert.deepEqual(visible.map(item => item.id), ['facilities-select']);
});

test('items with unmet conditions are excluded, not shown disabled', () => {
  const context = { hasItinerary: true, isTripDay: false, hasFocusedPlace: false, hasSavedTrip: false };
  const visible = visibleNaruHubItems(NARU_HUB_ITEMS, context, 6);
  const ids = visible.map(item => item.id);
  assert.ok(ids.includes('readiness-check'));
  assert.ok(ids.includes('transport-view'));
  assert.ok(!ids.includes('on-trip-order'));
  assert.ok(!ids.includes('inquiry-onsite'));
  assert.ok(!ids.includes('saved-trip-open'));
  assert.equal(visible.every(item => typeof item.label === 'string' && item.label.length > 0), true);
});

test('all conditions met still respects the limit and never returns a disabled placeholder shape', () => {
  const context = { hasItinerary: true, isTripDay: true, hasFocusedPlace: true, hasSavedTrip: true };
  const visible = visibleNaruHubItems(NARU_HUB_ITEMS, context, 6);
  assert.equal(visible.length, NARU_HUB_ITEMS.length);
  assert.ok(visible.length <= 6);
  const visibleThree = visibleNaruHubItems(NARU_HUB_ITEMS, context, 3);
  assert.equal(visibleThree.length, 3);
});

test('an unrecognised requires value never matches', () => {
  const context = { hasItinerary: true, isTripDay: true, hasFocusedPlace: true, hasSavedTrip: true };
  const visible = visibleNaruHubItems([{ id: 'x', label: '테스트', tool: 'facilities', requires: 'unknown' }], context, 6);
  assert.deepEqual(visible, []);
});

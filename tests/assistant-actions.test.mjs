import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSISTANT_ACTIONS, ASSISTANT_TOOLS, validateAssistantAction } from '../lib/assistant-actions.js';

// Regression lock (spec 19): removing a value here breaks saved trips and
// share links that still reference it. This list must never shrink.
const EXISTING_ACTIONS = ['create-itinerary', 'adapt-itinerary', 'set-dates', 'recalculate-route', 'save-trip', 'settings', 'search', 'add', 'remove', 'details', 'move', 'visit', 'break', 'day', 'start-time', 'deadline', 'readiness', 'compare', 'alternatives', 'next', 'undo', 'tool', 'help'];
const EXISTING_TOOLS = ['conditions', 'facilities', 'dates', 'places', 'itinerary', 'receipt', 'map', 'readiness', 'weather', 'transport', 'alternatives', 'comfort', 'budget', 'save', 'share', 'offline', 'calendar', 'on-trip', 'inquiry', 'preview', 'transcript', 'compare', 'course', 'split'];

test('no existing action or tool value has been removed', () => {
  for (const action of EXISTING_ACTIONS) assert.ok(ASSISTANT_ACTIONS.includes(action), `missing existing action: ${action}`);
  for (const tool of EXISTING_TOOLS) assert.ok(ASSISTANT_TOOLS.includes(tool), `missing existing tool: ${tool}`);
});

test('integrated whitelist adds only reviewed receipt viewing; facility and inquiry reuse existing actions', () => {
  assert.equal(ASSISTANT_ACTIONS.length, EXISTING_ACTIONS.length);
  assert.equal(ASSISTANT_TOOLS.length, EXISTING_TOOLS.length);
  assert.deepEqual([...ASSISTANT_ACTIONS].sort(), [...EXISTING_ACTIONS].sort());
  assert.deepEqual([...ASSISTANT_TOOLS].sort(), [...EXISTING_TOOLS].sort());
});

test('an action name outside the whitelist is dropped entirely, never substituted', () => {
  assert.equal(validateAssistantAction({ action: 'facility-filter', facilityKeys: ['elevator'] }), null);
  assert.equal(validateAssistantAction({ action: 'delete-account' }), null);
  assert.equal(validateAssistantAction({ action: 'open-url', url: 'https://example.com' }), null);
});

test('a tool name outside the whitelist is dropped entirely, never substituted', () => {
  assert.equal(validateAssistantAction({ action: 'tool', tool: 'communication' }), null);
  assert.deepEqual(validateAssistantAction({ action: 'tool', tool: 'facilities' }), { action: 'tool', tool: 'facilities' });
});

test('settings already accepts facility-only changes without a region, matching the facility-filter intent', () => {
  const result = validateAssistantAction({ action: 'settings', profiles: ['elevator', 'restroom'] });
  assert.deepEqual(result, { action: 'settings', profiles: ['elevator', 'restroom'] });
});

test('settings with no recognised field at all is rejected, not partially applied', () => {
  assert.equal(validateAssistantAction({ action: 'settings', unknown: 'value' }), null);
  assert.equal(validateAssistantAction({ action: 'settings', profiles: ['not-a-real-facility'] }), null);
});

test('placeId outside the caller-supplied list is dropped, never looked up fresh', () => {
  assert.equal(validateAssistantAction({ action: 'add', placeId: 'ghost' }, ['1001', '1002']), null);
  assert.deepEqual(validateAssistantAction({ action: 'add', placeId: '1001' }, ['1001', '1002']), { action: 'add', placeId: '1001' });
});

test('region, theme, date-range and time validation are unchanged', () => {
  assert.equal(validateAssistantAction({ action: 'settings', region: '없는지역' }), null);
  assert.deepEqual(validateAssistantAction({ action: 'settings', region: '창원' }), { action: 'settings', region: '창원' });
  assert.equal(validateAssistantAction({ action: 'settings', themes: ['not-a-theme'] }), null);
  assert.equal(validateAssistantAction({ action: 'set-dates', start: '2026-09-20', end: '2026-10-01' }), null); // beyond the 7-day cap
  assert.deepEqual(validateAssistantAction({ action: 'set-dates', start: '2026-09-20', end: '2026-09-22' }), { action: 'set-dates', start: '2026-09-20', end: '2026-09-22' });
  assert.equal(validateAssistantAction({ action: 'start-time', time: '9:00' }), null);
  assert.deepEqual(validateAssistantAction({ action: 'start-time', time: '09:00' }), { action: 'start-time', time: '09:00' });
});

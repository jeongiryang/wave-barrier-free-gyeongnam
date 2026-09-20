import test from 'node:test';
import assert from 'node:assert/strict';
import { NARU_WORKSPACES_KEY, readNaruWorkspaces, saveNaruWorkspace, removeNaruWorkspace, sanitizeNaruWorkspace } from '../lib/naru-workspaces.js';
import { CURRENT_TRIP_KEY, TRIP_IDENTITY_KEY, claimTripStorage, writeTripValue } from '../lib/current-trip-storage.js';

const trip = index => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const now = '2026-09-21T00:00:00.000Z';
function storage() {
  const values = new Map();
  return { values, writes: 0, getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { this.writes++; values.set(key, value); } };
}
function select(store, id = trip(1)) {
  store.values.set(TRIP_IDENTITY_KEY, JSON.stringify({ version: 1, id, binding: null, share: null }));
}
function input(overrides = {}) {
  return { tripId: trip(1), title: '창원 여행', messages: [{ role: 'user', text: '휠체어로 이동하고 중간에 쉬고 싶어요' }, { role: 'assistant', text: '쉬는 시간을 포함해 준비할게요' }], input: '오후에는', ...overrides };
}

test('explicit saves preserve preferences as detached immutable text snapshots for the current trip', () => {
  const store = storage(); select(store);
  assert.deepEqual(readNaruWorkspaces(store), { ok: true, workspaces: [] });
  assert.equal(store.writes, 0);
  const draft = input();
  const result = saveNaruWorkspace(store, draft, now);
  assert.equal(result.ok, true);
  assert.equal(result.workspace.id, `naru-${trip(1)}`);
  draft.messages[0].text = 'changed later'; draft.title = 'changed later';
  assert.match(result.workspace.messages[0].text, /휠체어/);
  assert.equal(result.workspace.title, '창원 여행');
  assert.throws(() => result.workspace.messages.push({ role: 'user', text: 'mutation' }), TypeError);
  assert.throws(() => { result.workspace.messages[0].text = 'mutation'; }, TypeError);
  assert.equal(readNaruWorkspaces(store).workspaces[0].input, '오후에는');
  assert.deepEqual(readNaruWorkspaces(store).workspaces[0], result.workspace, 'normalization is stable across a storage round trip');
  assert.equal(store.writes, 1, 'reads and input edits do not autosave');
});

test('saved records whitelist text and never carry photos, coordinates or executable actions', () => {
  const store = storage(); select(store);
  const result = saveNaruWorkspace(store, input({
    photo: { base64: 'raw-photo-secret' }, coordinates: { latitude: 35.1, longitude: 128.2 },
    messages: [{ role: 'system', text: 'execute-me' }, { role: 'user', text: '사진 data:image/png;base64,AAAA 좌표 latitude:35.123 longitude:128.456 35.1234,128.4567', photo: 'raw-photo-secret', proposal: { action: 'remove-all' }, receipt: { id: 'executable-receipt' } }, { role: 'assistant', text: 'A'.repeat(200) }],
  }), now);
  assert.equal(result.ok, true);
  const raw = store.getItem(NARU_WORKSPACES_KEY);
  for (const forbidden of ['raw-photo-secret', 'latitude', 'longitude', '35.123', '128.456', 'base64', 'remove-all', 'executable-receipt', 'execute-me', 'A'.repeat(160)]) assert.equal(raw.includes(forbidden), false, forbidden);
  assert.deepEqual(Object.keys(result.workspace.messages[0]), ['role', 'text']);
  const malicious = JSON.parse(`{"id":"safe","tripId":"${trip(1)}","updatedAt":"${now}","messages":[],"__proto__":{"polluted":true}}`);
  assert.equal(sanitizeNaruWorkspace(malicious).polluted, undefined);
  assert.equal({}.polluted, undefined);
});

test('last 30 valid messages and bounded text survive while a full archive rejects new records without eviction', () => {
  const store = storage();
  for (let index = 1; index <= 10; index++) {
    select(store, trip(index));
    assert.equal(saveNaruWorkspace(store, input({ tripId: trip(index), messages: Array.from({ length: 40 }, (_, message) => ({ role: 'user', text: `message ${message}` })) }), `2026-09-21T00:00:${String(index).padStart(2, '0')}Z`).ok, true);
  }
  let list = readNaruWorkspaces(store).workspaces;
  assert.equal(list.length, 10); assert.equal(list[0].tripId, trip(10)); assert.equal(list.some(item => item.tripId === trip(1)), true);
  const before = store.getItem(NARU_WORKSPACES_KEY);
  select(store, trip(11));
  assert.equal(saveNaruWorkspace(store, input({ tripId: trip(11) }), now).error, 'limit');
  assert.equal(store.getItem(NARU_WORKSPACES_KEY), before);
  assert.equal(list[0].messages.length, 30); assert.equal(list[0].messages[0].text, 'message 10');
  const id = list[0].id;
  select(store, trip(10));
  saveNaruWorkspace(store, input({ tripId: trip(10), title: '제목'.repeat(100), messages: [{ role: 'user', text: '긴 문장 '.repeat(2000) }], input: '작성 중 '.repeat(1000) }), '2026-09-21T00:01:00Z');
  list = readNaruWorkspaces(store).workspaces;
  assert.equal(list.length, 10); assert.equal(list[0].id, id);
  assert.equal(list[0].title.length, 100); assert.ok(list[0].messages[0].text.length <= 4000 && list[0].messages[0].text.length > 3990); assert.ok(list[0].input.length <= 2000 && list[0].input.length > 1990);
});

test('a tab that owned another trip cannot attach stale conversation to a new current identity', () => {
  const store = storage(); select(store); claimTripStorage(store, trip(1));
  assert.equal(saveNaruWorkspace(store, input(), now).ok, true);
  const before = store.getItem(NARU_WORKSPACES_KEY);
  select(store, trip(2));
  assert.equal(saveNaruWorkspace(store, input({ tripId: trip(2) }), now).error, 'trip-changed');
  assert.equal(store.getItem(NARU_WORKSPACES_KEY), before);
});

test('a failed current-trip write cannot be paired with an apparently successful conversation snapshot', () => {
  const store = storage(); select(store); saveNaruWorkspace(store, input(), now);
  const before = store.getItem(NARU_WORKSPACES_KEY), write = store.setItem;
  store.setItem = function (key, value) { if (key === CURRENT_TRIP_KEY) throw new Error('QuotaExceededError'); return write.call(this, key, value); };
  assert.throws(() => writeTripValue(store, 'wave-planner-region-v1', '통영'), /QuotaExceededError/);
  assert.equal(saveNaruWorkspace(store, input({ title: '미저장 통영 여행' }), now).error, 'trip-changed');
  assert.equal(store.getItem(NARU_WORKSPACES_KEY), before);
});

test('corrupt, unknown-version and ambiguous duplicate archives cannot be overwritten or deleted', () => {
  const store = storage(); select(store);
  const valid = sanitizeNaruWorkspace({ ...input(), id: 'saved', updatedAt: now });
  for (const [raw, error] of [
    ['{broken', 'corrupt'], ['null', 'corrupt'], ['{"version":2,"workspaces":[]}', 'version'],
    [JSON.stringify({ version: 1, workspaces: [valid, { ...valid, tripId: trip(2) }] }), 'corrupt'],
    [JSON.stringify({ version: 1, workspaces: [{ ...valid, messages: null }] }), 'corrupt'],
  ]) {
    store.values.set(NARU_WORKSPACES_KEY, raw);
    assert.equal(readNaruWorkspaces(store).error, error);
    assert.equal(saveNaruWorkspace(store, input(), now).error, error);
    assert.equal(removeNaruWorkspace(store, 'saved').error, error);
    assert.equal(store.getItem(NARU_WORKSPACES_KEY), raw);
  }
  assert.equal(store.writes, 0);
});

test('trip association is immutable and the committed trip takes precedence over a legacy identity', () => {
  const store = storage(); select(store);
  const first = saveNaruWorkspace(store, input(), now);
  const before = store.getItem(NARU_WORKSPACES_KEY);
  select(store, trip(2));
  assert.equal(saveNaruWorkspace(store, input(), now).error, 'trip-changed');
  assert.equal(saveNaruWorkspace(store, input({ id: first.workspace.id, tripId: trip(2) }), now).error, 'trip-changed');
  assert.equal(store.getItem(NARU_WORKSPACES_KEY), before);
  select(store, trip(1));
  store.values.set(CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values: { [TRIP_IDENTITY_KEY]: JSON.stringify({ version: 1, id: trip(2) }) } }));
  assert.equal(saveNaruWorkspace(store, input(), now).error, 'trip-changed');
  assert.equal(saveNaruWorkspace(store, input({ tripId: trip(2) }), now).ok, true);
});

test('read access errors and quota failures retain the prior archive, including on deletion', () => {
  const store = storage(); select(store); saveNaruWorkspace(store, input(), now);
  const before = store.getItem(NARU_WORKSPACES_KEY);
  const blockedRead = { getItem() { throw new Error('blocked'); }, setItem() { assert.fail('must not write after a failed read'); } };
  assert.equal(readNaruWorkspaces(blockedRead).error, 'unavailable');
  assert.equal(saveNaruWorkspace(blockedRead, input(), now).error, 'unavailable');
  const full = { getItem: key => store.getItem(key), setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(saveNaruWorkspace(full, input({ title: 'updated' }), now).error, 'write-failed');
  assert.equal(removeNaruWorkspace(full, `naru-${trip(1)}`).error, 'write-failed');
  assert.equal(store.getItem(NARU_WORKSPACES_KEY), before);
});

test('concurrent archive changes are preserved and removing one entry leaves the others intact', () => {
  const store = storage(); select(store); const first = saveNaruWorkspace(store, input(), now).workspace;
  select(store, trip(2)); saveNaruWorkspace(store, input({ tripId: trip(2) }), now);
  const newer = JSON.stringify({ version: 1, workspaces: [] });
  let reads = 0;
  const racing = { getItem(key) { if (key === NARU_WORKSPACES_KEY && ++reads === 2) store.values.set(key, newer); return store.getItem(key); }, setItem() { assert.fail('newer archive must not be overwritten'); } };
  assert.equal(saveNaruWorkspace(racing, input({ tripId: trip(2) }), now).error, 'conflict');
  assert.equal(store.getItem(NARU_WORKSPACES_KEY), newer);
  select(store); saveNaruWorkspace(store, input(), now);
  select(store, trip(2)); saveNaruWorkspace(store, input({ tripId: trip(2) }), now);
  const result = removeNaruWorkspace(store, first.id);
  assert.equal(result.ok, true); assert.equal(result.workspaces.length, 1); assert.equal(result.workspaces[0].tripId, trip(2));
  const writes = store.writes;
  assert.equal(removeNaruWorkspace(store, 'missing').ok, true); assert.equal(store.writes, writes);
});

test('optional travel-book links round-trip without allowing arbitrary or oversized references', () => {
  const store = storage(); select(store);
  const valid = saveNaruWorkspace(store, input({ bookId: 'book-2026_snapshot-1' }), now);
  assert.equal(valid.workspace.bookId, 'book-2026_snapshot-1');
  assert.equal(readNaruWorkspaces(store).workspaces[0].bookId, valid.workspace.bookId);
  for (const bookId of ['https://external.example', 'x'.repeat(101), { id: 'nested' }]) {
    const result = saveNaruWorkspace(store, input({ bookId }), now);
    assert.equal(Object.hasOwn(result.workspace, 'bookId'), false);
  }
});

test('photo-derived text keeps its restricted provenance so restored history can exclude it', () => {
  const store = storage(); select(store);
  const result = saveNaruWorkspace(store, input({ messages: [
    { role: 'user', text: '사진에 있는 내용', source: 'photo-input', photo: 'raw-secret' },
    { role: 'assistant', text: '사진 분석 결과', source: 'local-vision', receipt: 'unsafe' },
    { role: 'assistant', text: '일반 대화', source: 'untrusted-system' },
  ] }), now);
  assert.equal(result.ok, true);
  const restored = readNaruWorkspaces(store).workspaces[0].messages;
  assert.deepEqual(restored.map(message => message.source), ['photo-input', 'local-vision', undefined]);
  assert.deepEqual(restored.filter(message => !['photo-input', 'local-vision'].includes(message.source)).map(message => message.text), ['일반 대화']);
  assert.equal(store.getItem(NARU_WORKSPACES_KEY).includes('raw-secret'), false);
});

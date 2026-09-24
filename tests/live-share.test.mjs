import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { liveSharePayload, shareSecretHash, shareCookieName, shareCookie, LIVE_SHARE_LIFETIME } from '../lib/trips/live-share.js';
import { cacheControlHeader } from '../lib/http-cache.js';
import { verifySameOriginMutation } from '../lib/security/request-boundaries.js';

const origin = 'https://wave.example';
const id = 'abcdef123456';
const secret = '0123456789abcdef'.repeat(4); // Synthetic management capability, never a real account token.
const selections = () => ({ region: '창원', themes: ['history'], travelStart: '2026-09-20', travelEnd: '2026-09-21', dayStartTime: '10:30', travelMode: 'car',
  selectedPlaceIds: ['1748884', '1904774'], scheduleAssignments: { '1748884': '2026-09-21', '1904774': '2026-09-20' },
  visitMinutesByPlaceId: { '1748884': 60 }, breakMinutesByPlaceId: { '1904774': 30 }, restPurposeByPlaceId: { '1904774': 'rest' },
  fixedVisits: { '1748884': { kind: 'event', position: 0, time: '14:00' } }, dayDeadlines: { '2026-09-21': { time: '18:00', returnMinutes: 40, bufferMinutes: 15 } } });
const body = change => ({ live: true, selections: { ...selections(), ...change } });
const privateValue = 'PRIVATE-DO-NOT-PUBLISH';
const request = (value, cookie = '', target = id, requestOrigin = origin) => new Request(`${origin}/api/trips${target ? `/${target}` : ''}`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin: requestOrigin, cookie }, body: JSON.stringify(value),
});

function compile(path, dependencies) {
  const exports = {};
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', output)(exports, name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return exports;
}
const http = compile('../server/shared/http.ts', {
  '../../lib/http-cache.js': { cacheControlHeader }, '../../lib/security/request-boundaries.js': { verifySameOriginMutation },
});
function writer({ user = null, row, cas = true } = {}) {
  const calls = [];
  const sql = async (parts, ...values) => {
    const text = parts.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ text, values });
    if (text.startsWith('INSERT')) return [];
    if (text.startsWith('SELECT')) return row ? [row] : [];
    if (text.startsWith('UPDATE')) return cas ? [{ revision: Number(row.revision) + 1 }] : [];
    throw new Error(`Unexpected SQL: ${text}`);
  };
  const loaded = compile('../server/trips/live-actions.ts', {
    '../../features/community/server/session': { optionalCommunityUser: async () => user },
    '../../lib/trips/live-share.js': { liveSharePayload, shareCookie, shareCookieName, shareSecretHash, LIVE_SHARE_LIFETIME },
    './database': { ensureTripDatabase: async () => sql }, './write-budget': { sharedTripWriteRejection: async () => null }, '../shared/http': http,
  });
  return { write: loaded.writeLiveTrip, calls };
}
function itinerary({ row, current, liveWrite = async () => http.json({ ok: true }) } = {}) {
  const reads = [], writes = [], providerCalls = [];
  const sql = async (parts, ...values) => {
    const text = parts.join('?').replace(/\s+/g, ' ').trim();
    reads.push({ text, values });
    if (text.startsWith('SELECT payload')) return row ? [row] : [];
    if (text.startsWith('SELECT revision')) return current === null ? [] : [current || { revision: row.revision }];
    throw new Error(`Unexpected SQL: ${text}`);
  };
  const actions = compile('../server/trips/itinerary-actions.ts', {
    './live-actions': { writeLiveTrip: async (...args) => { writes.push(args); return liveWrite(...args); } },
    '../shared/http': http, '../shared/observability': { recordOperationalEvent() {} },
    '../tourism/plan-builder': { buildPlan: async req => { providerCalls.push(req.url); return { places: [], statuses: [] }; } },
    '../tourism/shared-plan-restoration': { restoreSharedPlan: async (_env, _saved, _selections, plan) => ({ plan: await plan }) },
    './database': { ensureTripDatabase: async () => sql, sweepExpiredTrips: async () => 0 },
    './payload': { normalizeTripSelections: value => value, storedTripPayload: value => value },
    '../../lib/trips/retention.js': { SAVE_PATH_SWEEP_LIMIT: 1 }, './write-budget': { sharedTripWriteRejection: async () => null },
  });
  return { ...actions, reads, writes, providerCalls };
}

test('public projection excludes profiles, facilities, notes, current origin and arbitrary top-level data', () => {
  const input = { ...body(), notes: privateValue, origin: { latitude: 35, longitude: 128, label: privateValue }, plan: { places: [{ summary: privateValue }] },
    owner_id: privateValue, manage_hash: privateValue, arbitrary: privateValue,
    selections: { ...selections(), profiles: [privateValue], facilityKeys: [privateValue], note: privateValue, title: privateValue,
      comfort: { diagnosis: privateValue }, origin: { label: privateValue }, arbitrary: privateValue, email: privateValue } };
  const snapshot = structuredClone(input);
  const result = liveSharePayload(input);
  assert.deepEqual(Object.keys(result).sort(), ['origin', 'placeRefs', 'selections']);
  assert.deepEqual(Object.keys(result.selections).sort(), ['region', 'theme', 'profiles', 'locale', 'travelStart', 'travelEnd', 'dayStartTime', 'travelMode',
    'selectedPlaceIds', 'scheduleAssignments', 'visitMinutesByPlaceId', 'fixedVisits', 'dayDeadlines', 'breakMinutesByPlaceId', 'restPurposeByPlaceId', 'temporaryStops'].sort());
  assert.deepEqual(result.selections.profiles, []);
  assert.deepEqual(result.origin, { label: '' });
  assert.equal(JSON.stringify(result).includes(privateValue), false);
  assert.deepEqual(input, snapshot, 'projection must not clear the private source trip');
});

test('public per-stop fields preserve actual order and calendar assignments, and strip nested free text and unselected IDs', () => {
  const source = selections();
  source.fixedVisits['1748884'].note = privateValue;
  source.dayDeadlines['2026-09-21'].origin = privateValue;
  source.fixedVisits['999999'] = { kind: 'visit', position: 1, time: '15:00' };
  source.visitMinutesByPlaceId['999999'] = 120;
  source.breakMinutesByPlaceId['999999'] = 30;
  source.restPurposeByPlaceId['999999'] = 'rest';
  const result = liveSharePayload({ selections: source });
  assert.deepEqual(result.placeRefs, [{ contentId: '1748884', order: 0 }, { contentId: '1904774', order: 1 }]);
  const { themes, ...expected } = selections();
  assert.deepEqual(result.selections, { ...expected, restPurposeByPlaceId: {}, theme: themes.join(','), profiles: [], locale: 'ko', temporaryStops: [] });
  assert.equal(JSON.stringify(result).includes(privateValue), false);
});

test('missing or malformed selection envelopes cannot create a public share', () => {
  for (const value of [undefined, null, true, [], {}, { selections: [] }, { selections: 'draft' }, { selections: {} }]) {
    assert.throws(() => liveSharePayload(value));
  }
});

test('only real dates and at most seven inclusive days are accepted without changing the chosen dates', () => {
  for (const change of [{ travelStart: '' }, { travelEnd: '' }, { travelStart: '2026-02-30' }, { travelStart: ['2026-09-20'] },
    { travelEnd: '2026-09-19' }, { travelEnd: '2026-09-27' }, { travelStart: 20260920 }, { travelEnd: null }]) {
    assert.throws(() => liveSharePayload(body(change)));
  }
  const accepted = liveSharePayload(body({ travelStart: '2028-02-29', travelEnd: '2028-03-06', scheduleAssignments: {} }));
  assert.equal(accepted.selections.travelStart, '2028-02-29');
  assert.equal(accepted.selections.travelEnd, '2028-03-06');
});

test('place IDs are a bounded nonempty unique list of official numeric identifier strings', () => {
  for (const selectedPlaceIds of [[], ['1748884', '1748884'], [1748884], [null], ['<script>'], ['https://private.example'], ['123456789012345678901'],
    Array.from({ length: 13 }, (_, index) => String(index + 1)), '1748884', {}]) {
    assert.throws(() => liveSharePayload(body({ selectedPlaceIds })));
  }
  const ids = Array.from({ length: 12 }, (_, index) => String(index + 1));
  assert.deepEqual(liveSharePayload(body({ selectedPlaceIds: ids, scheduleAssignments: {} })).selections.selectedPlaceIds, ids);
});

test('selected-place assignments cannot silently move outside the public travel period', () => {
  for (const day of ['2026-09-19', '2026-09-22', '2026-02-30', ['2026-09-20'], true]) {
    assert.throws(() => liveSharePayload(body({ scheduleAssignments: { '1748884': day } })));
  }
  const result = liveSharePayload(body({ scheduleAssignments: { '1748884': '2026-09-21', '999999': privateValue } }));
  assert.deepEqual(result.selections.scheduleAssignments, { '1748884': '2026-09-21', '1904774': '2026-09-20' });
});

test('public start time is always a validated clock string, never an array accepted by regex coercion', () => {
  for (const dayStartTime of [['10:30'], [['10:30']], { value: '10:30' }, 1030, true, null, '99:99']) {
    let result;
    try { result = liveSharePayload(body({ dayStartTime })); } catch { continue; }
    assert.equal(typeof result.selections.dayStartTime, 'string');
    assert.match(result.selections.dayStartTime, /^([01]\d|2[0-3]):[0-5]\d$/);
  }
});

test('public links have one fixed thirty-day lifetime, independent of travel dates', () => {
  assert.equal(LIVE_SHARE_LIFETIME, 2_592_000_000);
  assert.equal(LIVE_SHARE_LIFETIME / 86_400_000, 30);
});

test('management secrets require exactly 256-bit lowercase hex and are hashed before storage', async () => {
  const expected = createHash('sha256').update(secret).digest('hex');
  assert.equal(await shareSecretHash(secret), expected);
  assert.notEqual(expected, secret);
  assert.notEqual(await shareSecretHash('f'.repeat(64)), expected);
  for (const malformed of ['', undefined, null, 42, [secret], {}, secret.toUpperCase(), secret.slice(1), `${secret}0`, ` ${secret}`, `${secret}\n`, 'g'.repeat(64)]) {
    assert.equal(await shareSecretHash(malformed), '', `reject malformed management capability: ${typeof malformed}`);
  }
});

test('management cookie parsing is scoped to one exact valid share ID, without prefix or separator injection', () => {
  assert.equal(shareCookieName(id), `wave-share-${id}`);
  for (const malformed of ['', 'abcdef12345', 'abcdef1234567', 'ABCDEF123456', `${id}; other=x`, `${id}\r\n`, '../abcdef123456']) {
    assert.equal(shareCookieName(malformed), '');
    assert.equal(shareCookie(new Request(origin, { headers: { cookie: `wave-share-${id}=${secret}` } }), malformed), '');
  }
  const cookie = `wave-share-${id}-other=wrong; prefix-wave-share-${id}=wrong; wave-share-123456abcdef=other; wave-share-${id}=${secret}; unrelated=tail`;
  assert.equal(shareCookie(new Request(origin, { headers: { cookie } }), id), secret);
  assert.equal(shareCookie(new Request(origin), id), '');
});

test('creation binds only the authenticated owner and returns an HttpOnly scoped management cookie, not the secret in JSON', async () => {
  const f = writer({ user: { id: 'actual-owner' } });
  const input = { ...body(), owner_id: 'forged-owner', manage_hash: 'forged-hash', expiresAt: Number.MAX_SAFE_INTEGER };
  const before = Date.now();
  const response = await f.write(request(input, '', ''), input);
  const after = Date.now(), output = await response.json(), cookie = response.headers.get('set-cookie');
  assert.equal(response.status, 201);
  assert.match(output.id, /^[a-f\d]{12}$/);
  assert.equal(output.revision, 1);
  assert.ok(output.expiresAt >= before + LIVE_SHARE_LIFETIME && output.expiresAt <= after + LIVE_SHARE_LIFETIME);
  assert.match(cookie, new RegExp(`^wave-share-${output.id}=[a-f\\d]{64};`));
  assert.match(cookie, /; Path=\/api\/trips;/);
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Max-Age=2592000', 'Secure']) assert.ok(cookie.split('; ').includes(flag), flag);
  const capability = cookie.split(';')[0].split('=')[1];
  assert.equal(JSON.stringify(output).includes(capability), false);
  assert.equal(JSON.stringify(output).includes('actual-owner'), false);
  const insert = f.calls.find(call => call.text.startsWith('INSERT'));
  assert.ok(insert.values.includes('actual-owner'));
  assert.ok(insert.values.includes(await shareSecretHash(capability)));
  assert.equal(insert.values.includes(capability), false);
  assert.equal(insert.values.includes('forged-owner'), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('knowing a public ID or supplying owner/hash fields cannot edit it; owner or exact management capability can', async () => {
  const row = { revision: 3, owner_id: 'owner', manage_hash: await shareSecretHash(secret), expires_at: Date.now() + 1_000_000 };
  const input = { ...body(), revision: 3, owner_id: 'owner', manage_hash: row.manage_hash };
  for (const [user, cookie] of [[null, ''], [{ id: 'outsider' }, ''], [null, `wave-share-123456abcdef=${secret}`], [null, `wave-share-${id}=${'a'.repeat(64)}`]]) {
    const f = writer({ user, row });
    assert.equal((await f.write(request(input, cookie), input, id)).status, 403);
    assert.equal(f.calls.some(call => call.text.startsWith('UPDATE')), false);
  }
  for (const [user, cookie] of [[{ id: 'owner' }, ''], [null, `wave-share-${id}=${secret}`]]) {
    const f = writer({ user, row });
    const response = await f.write(request(input, cookie), input, id);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).revision, 4);
    assert.equal(f.calls.filter(call => call.text.startsWith('UPDATE')).length, 1);
  }
});

test('stale writes and revocation races return conflict; revoke does not require or replace a public payload', async () => {
  const row = { revision: 4, owner_id: 'owner', manage_hash: null, expires_at: Date.now() + 1_000_000 };
  for (const operation of ['update', 'revoke']) {
    const f = writer({ user: { id: 'owner' }, row, cas: false });
    const input = operation === 'revoke' ? { operation, revision: 3 } : { ...body(), revision: 3 };
    const response = await f.write(request(input), input, id);
    assert.equal(response.status, 409);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(f.calls.filter(call => call.text.startsWith('UPDATE')).length, 1);
  }
  const f = writer({ user: { id: 'owner' }, row });
  const input = { operation: 'revoke', revision: 4, selections: { note: privateValue } };
  const response = await f.write(request(input), input, id);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revoked, true);
  const update = f.calls.find(call => call.text.startsWith('UPDATE'));
  assert.match(update.text, /SET revoked = TRUE, revision = revision \+ 1/);
  assert.doesNotMatch(update.text, /SET payload|expires_at =/);
  assert.equal(update.values.some(value => String(value).includes(privateValue)), false);
});

test('live reads are not cached and recheck revision/revocation after provider restoration', async () => {
  const row = { payload: liveSharePayload(body()), revision: 2, live: true, created_at: Date.now(), expires_at: Date.now() + 1_000_000 };
  for (const [current, status] of [[{ revision: 2 }, 200], [{ revision: 3 }, 409], [null, 404]]) {
    const f = itinerary({ row, current });
    const req = new Request(`${origin}/api/trips/${id}`);
    const response = await f.loadSharedTrip(req, {}, id, new URL(req.url));
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(f.reads.length, 2);
    const result = await response.json();
    if (status === 200) assert.deepEqual(result.selections.selectedPlaceIds, selections().selectedPlaceIds);
    else assert.equal('selections' in result, false, 'a stale public snapshot must not accompany the error');
  }
});

test('live writes use the same-origin JSON and actual body-size boundary before management-cookie authority', async () => {
  const f = itinerary();
  for (const [req, status] of [[request(body(), '', id, 'https://foreign.example'), 403],
    [request({ ...body(), ignored: 'x'.repeat(70_001) }), 413],
    [new Request(`${origin}/api/trips/${id}`, { method: 'POST', headers: { origin, 'content-type': 'text/plain' }, body: '{}' }), 415]]) {
    const response = await f.saveSharedTrip(req, new URL(req.url), id);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(f.writes.length, 0);
  }
  const req = request({ ...body(), revision: 1 });
  assert.equal((await f.saveSharedTrip(req, new URL(req.url), id)).status, 200);
  assert.equal(f.writes.length, 1);
});


test('public creation projection removes every private rest purpose without mutating the source', () => {
  for (const purpose of ['rest', 'restroom', 'nap', 'nursing']) {
    const input = body({ restPurposeByPlaceId: { '1904774': purpose } });
    const result = liveSharePayload(input);
    assert.deepEqual(result.selections.restPurposeByPlaceId, {});
    assert.deepEqual(result.selections.breakMinutesByPlaceId, { '1904774': 30 });
    assert.equal(input.selections.restPurposeByPlaceId['1904774'], purpose);
  }
});

test('legacy and live shared reads redact already stored rest purposes while preserving timing', async () => {
  for (const live of [false, true]) {
    const payload = { selections: { ...selections(), profiles: ['wheelchair'], restPurposeByPlaceId: { '1904774': 'nursing' } }, origin: { label: privateValue } };
    const row = { payload, revision: 2, live, created_at: Date.now(), expires_at: Date.now() + 1_000_000 };
    const f = itinerary({ row });
    const req = new Request(`${origin}/api/trips/${id}`);
    const response = await f.loadSharedTrip(req, {}, id, new URL(req.url));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.selections.restPurposeByPlaceId, {});
    assert.deepEqual(result.selections.profiles, []);
    assert.deepEqual(result.origin, { label: '' });
    assert.deepEqual(result.selections.breakMinutesByPlaceId, { '1904774': 30 });
    assert.equal(payload.selections.restPurposeByPlaceId['1904774'], 'nursing');
    assert.equal(new URL(f.providerCalls[0]).searchParams.get('profiles'), '');
  }
});

test('live create and update persist only redacted rest purposes at the SQL boundary', async () => {
  for (const updating of [false, true]) {
    const row = { revision: 3, owner_id: 'owner', manage_hash: null, expires_at: Date.now() + 1_000_000 };
    const f = writer({ user: { id: 'owner' }, row });
    const input = { ...body({ restPurposeByPlaceId: { '1904774': 'nursing' } }), revision: 3 };
    const response = await f.write(request(input, '', updating ? id : ''), input, updating ? id : '');
    assert.equal(response.status, updating ? 200 : 201);
    const write = f.calls.find(call => call.text.startsWith(updating ? 'UPDATE' : 'INSERT'));
    const stored = write.values.find(value => typeof value === 'string' && value.startsWith('{'));
    assert.ok(stored, 'the actual persistence call must contain the public payload');
    const payload = JSON.parse(stored);
    assert.deepEqual(payload.selections.restPurposeByPlaceId, {});
    assert.deepEqual(payload.selections.breakMinutesByPlaceId, { '1904774': 30 });
    assert.equal(input.selections.restPurposeByPlaceId['1904774'], 'nursing');
  }
});

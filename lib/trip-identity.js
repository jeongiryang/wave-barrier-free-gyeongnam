import { TRIP_IDENTITY_KEY, readTripValue, writeTripValue, claimTripStorage } from './current-trip-storage.js';
export { TRIP_IDENTITY_KEY };
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const revision = value => Number.isSafeInteger(value) && value > 0;
export function cleanIdentity(value) {
  if (!record(value) || value.version !== 1 || typeof value.id !== 'string' || !uuid.test(value.id)) return null;
  let binding = null, share = null;
  const b = value.binding;
  if (record(b) && typeof b.id === 'string' && b.id.length > 0 && b.id.length <= 160) {
    if (b.kind === 'local') binding = { kind: 'local', id: b.id };
    else if (b.kind === 'account' && uuid.test(b.id) && typeof b.userId === 'string' && b.userId.length > 0 && b.userId.length <= 256 && revision(b.revision)) binding = { kind: 'account', id: b.id, userId: b.userId, revision: b.revision, role: b.role === 'member' ? 'member' : 'owner' };
  }
  const s = value.share;
  if (record(s) && typeof s.id === 'string' && /^[a-f\d]{12}$/.test(s.id) && revision(s.revision) && typeof s.expiresAt === 'number' && Number.isFinite(s.expiresAt) && s.expiresAt > 0 && s.expiresAt <= 8.64e15) share = { id: s.id, revision: s.revision, expiresAt: s.expiresAt, ...(typeof s.snapshotHash === 'string' && /^[a-f\d]{64}$/.test(s.snapshotHash) ? { snapshotHash: s.snapshotHash } : {}) };
  return { version: 1, id: value.id, binding, share };
}
export function newTripIdentity() { return { version: 1, id: crypto.randomUUID(), binding: null, share: null }; }
export function readTripIdentity(storage) {
  try { return cleanIdentity(JSON.parse(readTripValue(storage, TRIP_IDENTITY_KEY) || 'null')); }
  catch { return null; }
}
export function writeTripIdentity(storage, identity) {
  const value = cleanIdentity(identity);
  if (!value) throw new Error('INVALID_TRIP_IDENTITY');
  writeTripValue(storage, TRIP_IDENTITY_KEY, JSON.stringify(value));
  return value;
}
export function ensureTripIdentity(storage) {
  const existing = readTripIdentity(storage);
  if (existing) { claimTripStorage(storage, existing.id); return existing; }
  const created = writeTripIdentity(storage, newTripIdentity()); claimTripStorage(storage, created.id); return created;
}

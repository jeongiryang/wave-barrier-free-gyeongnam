// Tab-scoped recovery. A draft is never read for a different signed-in account.
export const tripDraftKey = (userId, tripId) => `wave-account-draft-v1:${encodeURIComponent(userId)}:${encodeURIComponent(tripId)}`;

export function readTripDraft(storage, userId, tripId) {
  try {
    const raw = storage.getItem(tripDraftKey(userId, tripId));
    if (!raw || raw.length > 16000) return null;
    const value = JSON.parse(raw);
    if (value.version !== 1 || !Number.isInteger(value.revision) || !value.payload || typeof value.payload !== 'object') return null;
    const p = value.payload;
    if (typeof p.title !== 'string' || p.title.length > 80 || typeof p.note !== 'string' || p.note.length > 1200 || typeof p.travelStart !== 'string' || typeof p.travelEnd !== 'string' || typeof p.dayStartTime !== 'string' || !Array.isArray(p.placeIds) || p.placeIds.length > 12 || p.placeIds.some(id => typeof id !== 'string' || !/^\d{1,20}$/.test(id)) || !p.scheduleAssignments || typeof p.scheduleAssignments !== 'object') return null;
    return value;
  } catch { return null; }
}

export function writeTripDraft(storage, userId, tripId, revision, payload) {
  try {
    const raw = JSON.stringify({ version: 1, revision, payload });
    if (raw.length > 16000) return false;
    storage.setItem(tripDraftKey(userId, tripId), raw);
    return true;
  } catch { return false; }
}

export function clearTripDraft(storage, userId, tripId) {
  try { storage.removeItem(tripDraftKey(userId, tripId)); } catch { /* The stored draft remains scoped to its owner. */ }
}

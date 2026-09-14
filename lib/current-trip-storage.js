// One record is the commit point for replacing a trip. Legacy keys are mirrors,
// never the source after migration, so an interrupted write cannot mix trips.
export const CURRENT_TRIP_KEY = "wave-current-trip-v1";
export const REGION_KEY = "wave-planner-region-v1";
export const THEMES_KEY = "wave-trip-themes-v1";
export const TRIP_IDENTITY_KEY = "wave-trip-identity-v1";
export const FACILITIES_KEY = "wave-trip-facilities-v1";
export const GUIDANCE_KEY = "wave-trip-guidance-v1";
export const CURRENT_TRIP_VALUE_KEYS = ["wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1", REGION_KEY, THEMES_KEY, FACILITIES_KEY, GUIDANCE_KEY, TRIP_IDENTITY_KEY];
// A downloaded trip may move between devices; ownership and live-share
// bindings stay only on the device that created them.
export const CURRENT_TRIP_EXPORT_KEYS = CURRENT_TRIP_VALUE_KEYS.filter(key => key !== TRIP_IDENTITY_KEY);
const keys = CURRENT_TRIP_VALUE_KEYS;
const pendingWrites = new WeakMap();
const ownedTrips = new WeakMap();
const ownedRecords = new WeakMap();
export function claimTripStorage(storage, id) { if (!ownedTrips.has(storage)) { ownedTrips.set(storage, id); ownedRecords.set(storage, storage.getItem(CURRENT_TRIP_KEY)); } }
export function tripStorageConflict(storage) { const id = ownedTrips.get(storage); return id !== undefined && (id !== tripId(readTripValue(storage, TRIP_IDENTITY_KEY)) || ownedRecords.get(storage) !== storage.getItem(CURRENT_TRIP_KEY)); }
export function assertTripStorageOwner(storage) { if (tripStorageConflict(storage)) throw new Error("다른 탭에서 여행이 바뀌었어요. 새로고침해서 확인해 주세요."); }
const listeners = new Set();
export function subscribeTripStorage(listener) { listeners.add(listener); if (typeof window !== 'undefined') window.addEventListener('storage', listener); return () => { listeners.delete(listener); if (typeof window !== 'undefined') window.removeEventListener('storage', listener); }; }
export function tripStorageFailed(storage) { return pendingWrites.has(storage) || tripStorageConflict(storage); }
function publish() { for (const listener of listeners) listener(); }

export function readTripValue(storage, key) {
  const raw = storage.getItem(CURRENT_TRIP_KEY);
  if (raw !== null) {
    const record = JSON.parse(raw);
    if (!record || record.version !== 1 || !record.values || typeof record.values !== "object" || Array.isArray(record.values)) throw new Error("INVALID_CURRENT_TRIP");
    return typeof record.values[key] === "string" ? record.values[key] : null;
  }
  return storage.getItem(key);
}

export function replaceCurrentTrip(storage, values) {
  // A rejected whole-trip replacement must never become a pending edit of the
  // still-visible old trip. Only writeTripValue records in-place pending edits.
  const identity = Object.hasOwn(values, TRIP_IDENTITY_KEY) ? values[TRIP_IDENTITY_KEY] : readTripValue(storage, TRIP_IDENTITY_KEY);
  const next = Object.fromEntries(keys.map(key => [key, key === TRIP_IDENTITY_KEY ? identity : values[key] ?? null]));
  storage.setItem(CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values: next }));
  // A whole new identity belongs to the next document. Old effects must not adopt it.
  if (ownedTrips.get(storage) === tripId(identity)) ownedRecords.set(storage, storage.getItem(CURRENT_TRIP_KEY));
  if (pendingWrites.delete(storage)) publish();
  for (const key of keys) {
    try { storage.setItem(key, next[key] || ""); } catch { /* The committed record is authoritative. */ }
  }
}

export function writeTripValue(storage, key, value) {
  assertTripStorageOwner(storage);
  let values;
  try { values = Object.fromEntries(keys.map(item => [item, readTripValue(storage, item)])); }
  catch (error) { pendingWrites.set(storage, { ...pendingWrites.get(storage), invalid: true }); publish(); throw error; }
  const pending = pendingWrites.get(storage);
  const base = tripId(values[TRIP_IDENTITY_KEY]);
  if (pending?.invalid || pending && pending.base !== base) {
    // The user must explicitly recover or replace a failed edit. Never attach
    // an old tab's account/share ownership to a newly opened trip.
    throw new Error('TRIP_CHANGED_DURING_PENDING_EDIT');
  }
  const edits = { ...pending?.edits, [key]: value };
  const next = { ...values, ...edits };
  try { replaceCurrentTrip(storage, next); }
  catch (error) { pendingWrites.set(storage, { base, edits }); publish(); throw error; }
}
function tripId(raw) { try { return JSON.parse(raw || 'null')?.id || ''; } catch { return ''; } }

export function emptyTrip(region, start, end) {
  return {
    [TRIP_IDENTITY_KEY]: JSON.stringify({ version: 1, id: crypto.randomUUID(), binding: null, share: null }),
    "wave-saved-places": "[]",
    "wave-saved-place-catalog-v1": "[]",
    "wave-trip-schedule-v1": JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: "10:00", travelMode: "transit", scheduleAssignments: {}, visitMinutesByPlaceId: {}, fixedVisits: {}, dayDeadlines: {}, comfort: { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 }, breakMinutesByPlaceId: {}, restPurposeByPlaceId: {} }),
    "wave-trip-order-v1": JSON.stringify({ mode: "auto", ids: [] }),
    [REGION_KEY]: region,
    [THEMES_KEY]: "[]",
    [FACILITIES_KEY]: "[]",
    [GUIDANCE_KEY]: "{}",
  };
}

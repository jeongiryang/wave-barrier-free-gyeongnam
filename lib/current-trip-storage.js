// One record is the commit point for replacing a trip. Legacy keys are mirrors,
// never the source after migration, so an interrupted write cannot mix trips.
export const CURRENT_TRIP_KEY = "wave-current-trip-v1";
export const REGION_KEY = "wave-planner-region-v1";
export const THEMES_KEY = "wave-trip-themes-v1";
const keys = ["wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1", REGION_KEY, THEMES_KEY];
const pendingWrites = new WeakMap();
const listeners = new Set();
export function subscribeTripStorage(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function tripStorageFailed(storage) { return pendingWrites.has(storage); }
function publish() { for (const listener of listeners) listener(); }

export function readTripValue(storage, key) {
  const raw = storage.getItem(CURRENT_TRIP_KEY);
  if (raw !== null) {
    const record = JSON.parse(raw);
    if (record.version !== 1 || !record.values || typeof record.values !== "object") throw new Error("INVALID_CURRENT_TRIP");
    return typeof record.values[key] === "string" ? record.values[key] : null;
  }
  return storage.getItem(key);
}

export function replaceCurrentTrip(storage, values) {
  // A rejected whole-trip replacement must never become a pending edit of the
  // still-visible old trip. Only writeTripValue records in-place pending edits.
  storage.setItem(CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values }));
  if (pendingWrites.delete(storage)) publish();
  for (const key of keys) {
    try { storage.setItem(key, values[key] || ""); } catch { /* The committed record is authoritative. */ }
  }
}

export function writeTripValue(storage, key, value) {
  let values;
  try { values = Object.fromEntries(keys.map(item => [item, readTripValue(storage, item)])); }
  catch (error) { pendingWrites.set(storage, { ...pendingWrites.get(storage), [key]: value }); publish(); throw error; }
  const next = { ...values, ...pendingWrites.get(storage), [key]: value };
  try { replaceCurrentTrip(storage, next); }
  catch (error) { pendingWrites.set(storage, { ...pendingWrites.get(storage), [key]: value }); publish(); throw error; }
}

export function emptyTrip(region, start, end) {
  return {
    "wave-saved-places": "[]",
    "wave-saved-place-catalog-v1": "[]",
    "wave-trip-schedule-v1": JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: "10:00", travelMode: "transit", scheduleAssignments: {} }),
    "wave-trip-order-v1": JSON.stringify({ mode: "auto", ids: [] }),
    [REGION_KEY]: region,
    [THEMES_KEY]: "[]",
  };
}

// One record is the commit point for replacing a trip. Legacy keys are mirrors,
// never the source after migration, so an interrupted write cannot mix trips.
export const CURRENT_TRIP_KEY = "wave-current-trip-v1";
export const REGION_KEY = "wave-planner-region-v1";
const keys = ["wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1", REGION_KEY];

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
  storage.setItem(CURRENT_TRIP_KEY, JSON.stringify({ version: 1, values }));
  for (const key of keys) {
    try { storage.setItem(key, values[key] || ""); } catch { /* The committed record is authoritative. */ }
  }
}

export function writeTripValue(storage, key, value) {
  if (storage.getItem(CURRENT_TRIP_KEY) === null) { storage.setItem(key, value); return; }
  const values = Object.fromEntries(keys.map(item => [item, readTripValue(storage, item)]));
  replaceCurrentTrip(storage, { ...values, [key]: value });
}

export function emptyTrip(region, start, end) {
  return {
    "wave-saved-places": "[]",
    "wave-saved-place-catalog-v1": "[]",
    "wave-trip-schedule-v1": JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: "10:00", scheduleAssignments: {} }),
    "wave-trip-order-v1": JSON.stringify({ mode: "auto", ids: [] }),
    [REGION_KEY]: region,
  };
}

export const TRAVEL_PROFILE_VERSION = 1;

function validIds(values, allowedIds) {
  const allowed = new Set(Array.isArray(allowedIds) ? allowedIds : []);
  return [...new Set(Array.isArray(values) ? values.filter((id) => typeof id === "string" && allowed.has(id)) : [])].slice(0, 6);
}

export function createTravelProfile(selectedIds, allowedIds, updatedAt = Date.now()) {
  return {
    version: TRAVEL_PROFILE_VERSION,
    selectedIds: validIds(selectedIds, allowedIds),
    updatedAt: Number.isFinite(Number(updatedAt)) ? Number(updatedAt) : Date.now(),
  };
}

export function sanitizeTravelProfile(value, allowedIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Number(value.version) !== TRAVEL_PROFILE_VERSION) return null;
  const selectedIds = validIds(value.selectedIds, allowedIds);
  const updatedAt = Number(value.updatedAt);
  if (!selectedIds.length || !Number.isFinite(updatedAt) || updatedAt <= 0) return null;
  return { version: TRAVEL_PROFILE_VERSION, selectedIds, updatedAt };
}

export const MIN_VISIT_MINUTES = 15;
export const MAX_VISIT_MINUTES = 720;

export function validVisitMinutes(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_VISIT_MINUTES && value <= MAX_VISIT_MINUTES;
}

/** Only explicit user choices for known places; absence keeps the category default. */
export function sanitizeVisitDurations(value, placeIds) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = placeIds ? new Set(placeIds) : null;
  return Object.fromEntries(Object.entries(value)
    .filter(([id, minutes]) => id.length > 0 && id.length <= 120 && (!allowed || allowed.has(id)) && validVisitMinutes(minutes))
    .slice(0, 100));
}

export function changeVisitDuration(current, id, minutes) {
  if (!id || (minutes !== null && !validVisitMinutes(minutes))) return current;
  const next = { ...current };
  if (minutes === null) delete next[id]; else next[id] = minutes;
  return next;
}

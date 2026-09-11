const profiles = ["wheel", "senior", "baby", "pregnant", "visual", "hearing"];
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const integer = (value, min, max) => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
export const emptyComfort = { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 };

export function sanitizeComfort(value) {
  const source = object(value);
  return { maxWalkMinutes: integer(source.maxWalkMinutes, 5, 240) ? source.maxWalkMinutes : null,
    breakEveryMinutes: integer(source.breakEveryMinutes, 30, 360) ? source.breakEveryMinutes : null,
    breakMinutes: integer(source.breakMinutes, 5, 120) ? source.breakMinutes : 15 };
}
function allowedEntries(value, allowedIds) {
  const allowed = allowedIds ? new Set(allowedIds) : null;
  return Object.entries(object(value)).filter(([id]) => id.length > 0 && id.length <= 80 && !["__proto__", "constructor", "prototype"].includes(id) && (!allowed || allowed.has(id)));
}
export function sanitizeTripBreaks(value, allowedIds) {
  return Object.fromEntries(allowedEntries(value, allowedIds).filter(([, minutes]) => integer(minutes, 5, 120)).slice(0, 100));
}
export function sanitizeStopPurposes(value, allowedIds) {
  return Object.fromEntries(allowedEntries(value, allowedIds).filter(([, purpose]) => ["rest", "restroom"].includes(purpose)).slice(0, 100));
}
/** Anonymous draft choices are combined locally; no participant identity is needed. */
export function combineCompanionNeeds(participants, selected = [], comfort = emptyComfort) {
  const current = sanitizeComfort(comfort);
  const members = Array.isArray(participants) ? participants.slice(0, 8) : [];
  const limits = [current.maxWalkMinutes, ...members.map(member => sanitizeComfort(member).maxWalkMinutes)].filter(value => value !== null);
  const choices = new Set([...selected, ...members.flatMap(member => Array.isArray(member?.profiles) ? member.profiles : [])]);
  return { selected: profiles.filter(id => choices.has(id)), comfort: { ...current, maxWalkMinutes: limits.length ? Math.min(...limits) : null } };
}
/** totalWalk is metres. Walk minutes come from route segments, never a distance conversion. */
export function routeWalkingEvidence(route) {
  if (!route?.configured || !["transit", "train", "bus", "walk", "car", "bicycle"].includes(route.mode)) return null;
  const segments = Array.isArray(route.segments) ? route.segments : [];
  const walking = segments.filter(segment => segment.type === "walk");
  const metres = typeof route.totalWalk === "number" && Number.isFinite(route.totalWalk) && route.totalWalk >= 0 ? route.totalWalk : null;
  if (!segments.length || walking.some(segment => !integer(segment.minutes, 0, 10080)) || (!walking.length && metres !== 0)) return { metres, minutes: null, longestMinutes: null };
  let continuous = 0, longestMinutes = 0;
  for (const segment of segments) {
    continuous = segment.type === "walk" ? continuous + segment.minutes : 0;
    longestMinutes = Math.max(longestMinutes, continuous);
  }
  return { metres, minutes: walking.reduce((sum, segment) => sum + segment.minutes, 0), longestMinutes };
}
export function assessWalking(entries, maxWalkMinutes) {
  const known = entries.filter(entry => entry.evidence?.minutes !== null && entry.evidence?.minutes !== undefined);
  return { checked: known.length, unknown: entries.length - known.length,
    minutes: known.reduce((sum, entry) => sum + entry.evidence.minutes, 0),
    metres: entries.reduce((sum, entry) => sum + (entry.evidence?.metres || 0), 0),
    unknownMetres: entries.filter(entry => entry.evidence?.metres === null || !entry.evidence).length,
    overLimit: integer(maxWalkMinutes, 5, 240) ? known.filter(entry => entry.evidence.longestMinutes > maxWalkMinutes).map(entry => ({ id: entry.id, minutes: entry.evidence.longestMinutes })) : [] };
}
/** Rests are proposed between visits. Applying them is a separate user action. */
export function suggestTripBreaks(days, preference, existing = {}) {
  const comfort = sanitizeComfort(preference), proposed = {};
  if (!comfort.breakEveryMinutes) return proposed;
  for (const { entries } of days) {
    let activeMinutes = 0;
    entries.forEach((entry, index) => {
      activeMinutes += entry.travelMinutes + entry.visitMinutes + (entry.waitingMinutes || 0);
      if (existing[entry.place.id]) activeMinutes = 0;
      else if (activeMinutes >= comfort.breakEveryMinutes && index < entries.length - 1) {
        proposed[entry.place.id] = comfort.breakMinutes; activeMinutes = 0;
      }
    });
  }
  return sanitizeTripBreaks(proposed);
}

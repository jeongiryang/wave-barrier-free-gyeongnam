const states = new Set(['confirmed', 'negative', 'unknown']);

/**
 * Measure only how much of the traveler's selected facility evidence has a
 * definite public-data record. This is deliberately not a safety score.
 */
export function assessEvidenceCoverage(places, requiredKeys) {
  const list = Array.isArray(places) ? places.filter(Boolean) : [];
  const keys = [...new Set((Array.isArray(requiredKeys) ? requiredKeys : []).filter(key => typeof key === 'string' && key.length > 0))];
  const total = list.length * keys.length;
  const counts = { confirmed: 0, negative: 0, unknown: 0 };

  for (const place of list) {
    const fields = new Map((Array.isArray(place.accessibility) ? place.accessibility : [])
      .filter(field => field && typeof field.key === 'string')
      .map(field => [field.key, states.has(field.state) ? field.state : 'unknown']));
    for (const key of keys) counts[fields.get(key) || 'unknown']++;
  }

  const checked = counts.confirmed + counts.negative;
  const percent = total ? Math.round((checked / total) * 100) : null;
  const grade = percent === null ? null : percent >= 90 ? 'A' : percent >= 60 ? 'B' : 'C';
  return { places: list.length, facilities: keys.length, total, checked, percent, grade, ...counts };
}

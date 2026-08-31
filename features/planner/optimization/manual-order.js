export function reconcilePlaceOrder(savedIds, preferredIds = []) {
  const saved = new Set(Array.isArray(savedIds) ? savedIds.filter(Boolean) : []);
  const ordered = [];
  for (const id of Array.isArray(preferredIds) ? preferredIds : []) {
    if (saved.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  for (const id of saved) if (!ordered.includes(id)) ordered.push(id);
  return ordered;
}

function placesForDay(orderIds, assignments, defaultDay, placeId) {
  const day = assignments?.[placeId] || defaultDay;
  return orderIds.filter((id) => (assignments?.[id] || defaultDay) === day);
}

export function placeMoveAvailability(orderIds, placeId, assignments = {}, defaultDay = "") {
  const sameDay = placesForDay(orderIds, assignments, defaultDay, placeId);
  const index = sameDay.indexOf(placeId);
  return {
    up: index > 0,
    down: index >= 0 && index < sameDay.length - 1,
  };
}

export function movePlaceWithinDay(orderIds, placeId, direction, assignments = {}, defaultDay = "") {
  const current = Array.isArray(orderIds) ? [...orderIds] : [];
  const sameDay = placesForDay(current, assignments, defaultDay, placeId);
  const index = sameDay.indexOf(placeId);
  const nextIndex = direction === "up" ? index - 1 : direction === "down" ? index + 1 : index;
  if (index < 0 || nextIndex < 0 || nextIndex >= sameDay.length || nextIndex === index) return current;
  const swapId = sameDay[nextIndex];
  const placeIndex = current.indexOf(placeId);
  const swapIndex = current.indexOf(swapId);
  [current[placeIndex], current[swapIndex]] = [current[swapIndex], current[placeIndex]];
  return current;
}

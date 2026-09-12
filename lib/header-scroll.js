export function navigationScroll(state, position, locked = false) {
  const y = Math.max(0, position);
  const delta = y - state.y;
  const direction = delta > 0 ? 1 : delta < 0 ? -1 : state.direction;
  const distance = direction === state.direction ? state.distance + Math.abs(delta) : Math.abs(delta);
  const hidden = locked || y < 48 ? false : direction === 1 && distance >= 48 && y > 120 ? true : direction === -1 && distance >= 120 ? false : state.hidden;
  return { y, direction, distance: locked ? 0 : distance, hidden };
}

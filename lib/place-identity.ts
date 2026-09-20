type Identity = { id: string; name: string; address: string; mapX: string; mapY: string };
const nameKey = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const addressKey = (value: string) => value.normalize('NFKC').replace(/^경남\s/, '경상남도 ').replace(/\s+/g, '').toLowerCase();

/** Never infer venue identity from a name, numeric provider ID, or proximity alone. */
export function samePublicPlace(left: Identity, right: Identity) {
  if (!nameKey(left.name) || nameKey(left.name) !== nameKey(right.name)) return false;
  if (![left.mapX, left.mapY, right.mapX, right.mapY].every(value => value.trim() && Number.isFinite(Number(value)))) return false;
  const dx = (Number(left.mapX) - Number(right.mapX)) * Math.cos(Number(left.mapY) * Math.PI / 180) * 111320;
  const dy = (Number(left.mapY) - Number(right.mapY)) * 111320;
  // Different entrances may be reported within the same building parcel; require
  // the complete address as well, so adjoining shops cannot inherit facilities.
  return Math.hypot(dx, dy) <= 150 && Boolean(addressKey(left.address)) && addressKey(left.address) === addressKey(right.address);
}

export function canonicalPublicPlace<T extends Identity>(search: Identity, candidates: T[]): T | undefined {
  const matches = [...new Map(candidates.filter(place => samePublicPlace(search, place)).map(place => [place.id, place])).values()];
  return matches.length === 1 ? matches[0] : undefined;
}

export function conflictingFacilities(left: { accessibility?: { key: string; label?: string; state: string }[] }, right: { accessibility?: { key: string; label?: string; state: string }[] }) {
  return (left.accessibility || []).filter(item => ['confirmed', 'negative'].includes(item.state) && right.accessibility?.some(other => other.key === item.key && ['confirmed', 'negative'].includes(other.state) && other.state !== item.state)).map(item => item.label || item.key);
}

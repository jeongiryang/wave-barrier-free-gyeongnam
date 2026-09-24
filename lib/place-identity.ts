type Identity = { id: string; name: string; address: string; mapX: string; mapY: string };
const nameKey = (value: string) => value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const addressKey = (value: string) => value.normalize('NFKC').replace(/^경남\s/, '경상남도 ').replace(/\s+/g, '').toLowerCase();

function sameAddress(left: string, right: string) {
  if (!addressKey(left) || !addressKey(right)) return false;
  if (addressKey(left) === addressKey(right)) return true;
  // A road address may append a legal neighborhood, e.g. "296 (퇴촌동)".
  // Only accept a single locality after a complete road/building number. Floors,
  // apartment blocks, building names and other parenthetical text stay distinct.
  const roadAddress = (value: string) => value.normalize('NFKC').trim().match(/^(.+(?:대로|로|길)\s+\d+(?:-\d+)?)(?:\s*\(([가-힣]{2,}(?:동|리))\))?$/);
  const a = roadAddress(left), b = roadAddress(right);
  if (!a || !b || addressKey(a[1]) !== addressKey(b[1])) return false;
  if ([a[2], b[2]].some(locality => locality && /(?:본관|별관|신관|구관|아파트|빌딩|상가)/.test(locality))) return false;
  return !a[2] || !b[2] || a[2] === b[2];
}

/** Never infer venue identity from a name, numeric provider ID, or proximity alone. */
export function samePublicPlace(left: Identity, right: Identity) {
  if (!nameKey(left.name) || nameKey(left.name) !== nameKey(right.name)) return false;
  if (![left.mapX, left.mapY, right.mapX, right.mapY].every(value => value.trim() && Number.isFinite(Number(value)))) return false;
  const dx = (Number(left.mapX) - Number(right.mapX)) * Math.cos(Number(left.mapY) * Math.PI / 180) * 111320;
  const dy = (Number(left.mapY) - Number(right.mapY)) * 111320;
  // Different entrances may be reported within the same building parcel; require
  // the same road/building address as well, so adjoining shops cannot inherit facilities.
  const distance = Math.hypot(dx, dy);
  // Public attractions sometimes omit a parcel number. Require the exact full
  // locality, exact name, very close points and a unique canonical candidate.
  const parcel = (address: string) => address.normalize('NFKC').trim().replace(/^경남\s/, '경상남도 ').match(/^(경상남도\s+[가-힣]+(?:시|군)\s+(?:[가-힣]+(?:구|읍|면)\s+)*[가-힣]+(?:동|리))(?:\s+(\d+(?:-\d+)?))?$/);
  const a = parcel(left.address), b = parcel(right.address);
  const missingParcel = a && b && Boolean(a[2]) !== Boolean(b[2]) && addressKey(a[1]) === addressKey(b[1]);
  return distance <= 150 && (sameAddress(left.address, right.address) || (distance <= 30 && Boolean(missingParcel)));
}

export function canonicalPublicPlace<T extends Identity>(search: Identity, candidates: T[]): T | undefined {
  const matches = [...new Map(candidates.filter(place => samePublicPlace(search, place)).map(place => [place.id, place])).values()];
  return matches.length === 1 ? matches[0] : undefined;
}

export function conflictingFacilities(left: { accessibility?: { key: string; label?: string; state: string }[] }, right: { accessibility?: { key: string; label?: string; state: string }[] }) {
  return (left.accessibility || []).filter(item => ['confirmed', 'negative'].includes(item.state) && right.accessibility?.some(other => other.key === item.key && ['confirmed', 'negative'].includes(other.state) && other.state !== item.state)).map(item => item.label || item.key);
}

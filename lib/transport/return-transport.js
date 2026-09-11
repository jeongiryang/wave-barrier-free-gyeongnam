import { mapDistanceMetres, supportedPlacePoint } from '../map-coordinates.js';

const text = (value, max = 100) => typeof value === 'string' || typeof value === 'number' ? String(value).replace(/<[^>]*>|[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
export const transportId = value => /^[A-Za-z0-9_-]{1,80}$/.test(text(value, 81)) ? text(value, 80) : '';
const nonnegative = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

export function nearbyReturnStops(items, origin) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).slice(0, 100).flatMap(item => {
    const nodeId = transportId(item?.nodeid ?? item?.nodeId), cityCode = text(item?.citycode ?? item?.cityCode, 12);
    if (!nodeId || !/^\d{2,8}$/.test(cityCode) || seen.has(cityCode + ':' + nodeId)) return [];
    const name = text(item?.nodenm ?? item?.nodeNm); if (!name) return [];
    const point = supportedPlacePoint(item.gpslong, item.gpslati);
    const distance = point && origin ? Math.round(mapDistanceMetres(origin, point)) : null;
    if (distance !== null && distance > 2000) return [];
    seen.add(cityCode + ':' + nodeId);
    return [{ nodeId, cityCode, name, point, distance }];
  }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, 8);
}

export function groupReturnArrivals(items, nodeId) {
  const groups = new Map();
  for (const item of (Array.isArray(items) ? items : []).slice(0, 100)) {
    const routeId = transportId(item?.routeid), actualNode = transportId(item?.nodeid);
    if (!routeId || (actualNode && actualNode !== nodeId)) continue;
    const routeName = text(item?.routeno); if (!routeName) continue;
    const seconds = nonnegative(item?.arrtime), stopsAway = nonnegative(item?.arrprevstationcnt);
    const arrival = { seconds: seconds !== null && seconds <= 86400 ? seconds : null, stopsAway: stopsAway !== null && Number.isInteger(stopsAway) && stopsAway <= 1000 ? stopsAway : null, vehicle: text(item?.vehicletp, 60) };
    const group = groups.get(routeId) || { routeId, routeName, vehicles: [] };
    group.vehicles.push(arrival); groups.set(routeId, group);
  }
  return [...groups.values()].map(group => ({ ...group, vehicles: group.vehicles.sort((a, b) => (a.seconds ?? Infinity) - (b.seconds ?? Infinity)).slice(0, 2) })).sort((a, b) => (a.vehicles[0]?.seconds ?? Infinity) - (b.vehicles[0]?.seconds ?? Infinity)).slice(0, 30);
}

export function returnRouteDirection(items, routeId, nodeId, complete = true) {
  const stops = (Array.isArray(items) ? items : []).slice(0, 500).flatMap(item => {
    if (transportId(item?.routeid) && transportId(item.routeid) !== routeId) return [];
    const id = transportId(item?.nodeid), name = text(item?.nodenm), order = nonnegative(item?.nodeord);
    if (!id || !name || order === null || !Number.isInteger(order)) return [];
    return [{ nodeId: id, name, order, direction: ['0','1'].includes(String(item.updowncd)) ? String(item.updowncd) : '', point: supportedPlacePoint(item.gpslong, item.gpslati) }];
  });
  const matches = stops.filter(stop => stop.nodeId === nodeId);
  if (!complete || stops.length !== (Array.isArray(items) ? items.length : 0) || matches.length !== 1) return { status: 'unconfirmed', stops: [], next: null, reason: '정류장의 노선 진행 방향을 하나로 확인하지 못했어요.' };
  const selected = matches[0], branch = stops.filter(stop => stop.direction === selected.direction).sort((a, b) => a.order - b.order);
  if (new Set(branch.map(stop => stop.order)).size !== branch.length) return { status: 'unconfirmed', stops: [], next: null, reason: '정류장 순서가 겹쳐 진행 방향을 확인하지 못했어요.' };
  const downstream = branch.filter(stop => stop.order > selected.order);
  return { status: downstream.length ? 'available' : 'terminal', stops: downstream, next: downstream[0] || null, reason: downstream.length ? '' : '이 방향에서 다음 정류장이 확인되지 않아요.' };
}

export function nearbyDownstreamStops(direction, target) {
  const point = supportedPlacePoint(target?.mapX, target?.mapY);
  if (!point || direction?.status !== 'available') return [];
  return direction.stops.flatMap(stop => stop.point ? [{ ...stop, distance: Math.round(mapDistanceMetres(point, stop.point)) }] : []).filter(stop => stop.distance <= 800).sort((a, b) => a.distance - b.distance).slice(0, 3);
}

export function originBusTimes(item) {
  const read = value => { const raw = text(value, 8); return /^(?:[01]\d|2[0-3])[0-5]\d$/.test(raw) ? raw.slice(0,2)+':'+raw.slice(2) : ''; };
  return { origin: text(item?.startnodenm), destination: text(item?.endnodenm), first: read(item?.startvehicletime), last: read(item?.endvehicletime) };
}

export function returnArrivalLabel(seconds, checkedAt, now = Date.now()) {
  const checked = Date.parse(checkedAt), elapsed = now - checked;
  if (!Number.isFinite(checked) || elapsed < -30000 || elapsed > 5 * 60 * 1000) return '오래된 도착 정보 · 다시 확인';
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '도착 시각 미확인';
  if (seconds === 0 && elapsed < 30000) return '조회 시점에 도착 예정 · 현장 확인';
  if (seconds - Math.max(0, elapsed) / 1000 <= 0) return '도착 예정 시각 지남 · 현재 도착 여부 확인';
  return `약 ${Math.ceil((seconds - Math.max(0, elapsed) / 1000) / 60)}분 뒤 도착 예상`;
}

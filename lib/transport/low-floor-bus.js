const clean = (value, max = 100) => typeof value === "string" || typeof value === "number"
  ? String(value).replace(/<[^>]*>|[\u0000-\u001f\u007f]/g, "").trim().slice(0, max)
  : "";

/** TAGO가 도착 차량 단위로 준 유형만 판정한다. 노선 전체 속성으로 승격하지 않는다. */
export function isLowFloorVehicle(value) {
  const label = clean(value, 60).replace(/[\s_-]+/g, "").toLowerCase();
  return label.includes("저상버스") || label.includes("lowfloor");
}

/**
 * 기존 return-transport 응답에서 현재 저상 차량이 확인된 정류장만 지도 마커로 만든다.
 * @param {Array<{ stop: Record<string, any>, response: Record<string, any> }>} observations
 */
export function lowFloorArrivalMarkers(observations) {
  const result = [];
  const seen = new Set();
  for (const observation of Array.isArray(observations) ? observations : []) {
    const stop = observation?.stop || {};
    const response = observation?.response || {};
    const lat = Number(stop?.point?.lat), lng = Number(stop?.point?.lng);
    const nodeId = clean(stop.nodeId, 80), cityCode = clean(stop.cityCode, 12), name = clean(stop.name);
    if (!nodeId || !cityCode || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const routes = (Array.isArray(response.routes) ? response.routes : []).flatMap(route => {
      const vehicles = (Array.isArray(route?.vehicles) ? route.vehicles : []).filter(vehicle => isLowFloorVehicle(vehicle?.vehicle));
      return vehicles.length ? [{ route: clean(route?.routeName, 40), vehicles }] : [];
    });
    if (!routes.length || seen.has(`${cityCode}:${nodeId}`)) continue;
    seen.add(`${cityCode}:${nodeId}`);
    const routeLabels = routes.map(item => item.route).filter(Boolean);
    const checkedAt = clean(response.arrivalCheckedAt, 40);
    result.push({
      id: `low-floor-${cityCode}-${nodeId}`,
      layerId: "low-floor-bus-arrival",
      name,
      address: `정류장 ${nodeId}`,
      destination: { latitude: lat, longitude: lng },
      distanceMeters: typeof stop.distance === "number" && Number.isFinite(stop.distance) ? stop.distance : null,
      source: "국토교통부 TAGO 버스도착정보",
      ...(checkedAt ? { referenceDate: checkedAt } : {}),
      detail: `${routeLabels.length ? `${routeLabels.join(", ")}번` : "노선 번호 미확인"} · 조회 시점에 저상버스로 표시된 도착 차량만 확인했어요. 다음 차량과 상시 운행 여부는 운영기관에 다시 확인해 주세요.`,
    });
  }
  return result.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
}

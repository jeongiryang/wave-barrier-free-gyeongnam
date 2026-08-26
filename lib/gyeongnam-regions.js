/**
 * 경남 18개 시·군의 대표 좌표. 서버의 날씨 조회와 브라우저의 지역 추론이 같은
 * 값을 써야 하므로 한곳에 둔다.
 *
 * 사진 좌표로 지역을 고르는 일은 반드시 브라우저 안에서 끝나야 한다. 좌표를
 * 서버로 보내 지역을 물어보는 순간 "GPS는 브라우저 밖으로 내보내지 않는다"는
 * 규칙이 깨지기 때문에, 이 표가 클라이언트에서도 필요하다.
 */
export const GYEONGNAM_REGION_POINTS = {
  "경남 전체": { lat: 35.2383, lng: 128.6924 },
  창원: { lat: 35.2279, lng: 128.6811 },
  진주: { lat: 35.1800, lng: 128.1076 },
  통영: { lat: 34.8544, lng: 128.4332 },
  사천: { lat: 35.0038, lng: 128.0642 },
  김해: { lat: 35.2285, lng: 128.8893 },
  밀양: { lat: 35.5038, lng: 128.7464 },
  거제: { lat: 34.8806, lng: 128.6211 },
  양산: { lat: 35.3350, lng: 129.0372 },
  의령: { lat: 35.3222, lng: 128.2617 },
  함안: { lat: 35.2725, lng: 128.4065 },
  창녕: { lat: 35.5446, lng: 128.4923 },
  고성: { lat: 34.9731, lng: 128.3223 },
  남해: { lat: 34.8377, lng: 127.8925 },
  하동: { lat: 35.0672, lng: 127.7513 },
  산청: { lat: 35.4156, lng: 127.8735 },
  함양: { lat: 35.5205, lng: 127.7252 },
  거창: { lat: 35.6867, lng: 127.9095 },
  합천: { lat: 35.5667, lng: 128.1658 },
};

/** "경남 전체"는 대표 좌표일 뿐 실제 시·군이 아니므로 추론 후보에서 뺀다. */
const NAMED_REGIONS = Object.keys(GYEONGNAM_REGION_POINTS).filter((name) => name !== "경남 전체");

function distanceKm(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const lat = ((a.lat + b.lat) / 2) * toRad;
  const x = dLng * Math.cos(lat);
  return Math.sqrt(dLat * dLat + x * x) * 6371;
}

/**
 * 좌표에서 가장 가까운 시·군을 고른다. 경남에서 지나치게 먼 좌표는 지역을
 * 지어내지 않고 빈 문자열을 돌려준다. 다른 지역에서 찍은 사진을 경남 여행으로
 * 둔갑시키지 않기 위해서다.
 */
export const REGION_MATCH_LIMIT_KM = 45;

export function nearestGyeongnamRegion(point, limitKm = REGION_MATCH_LIMIT_KM) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  let best = "";
  let bestDistance = Infinity;
  for (const name of NAMED_REGIONS) {
    const distance = distanceKm({ lat, lng }, GYEONGNAM_REGION_POINTS[name]);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }
  return bestDistance <= limitKm ? best : "";
}

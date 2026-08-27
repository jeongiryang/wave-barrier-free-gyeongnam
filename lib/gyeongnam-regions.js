/**
 * 경남 18개 시·군의 대표 좌표. 서버 날씨 조회와 브라우저의 사진 지역 추론이
 * 같은 값을 사용하도록 한곳에서 관리한다.
 *
 * 사진 좌표는 브라우저 안에서 지역을 추론하는 데만 사용하며 서버로 보내지 않는다.
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

const NAMED_REGIONS = Object.keys(GYEONGNAM_REGION_POINTS).filter((name) => name !== "경남 전체");

function distanceKm(a, b) {
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const lat = ((a.lat + b.lat) / 2) * toRad;
  const x = dLng * Math.cos(lat);
  return Math.sqrt((dLat * dLat) + (x * x)) * 6371;
}

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
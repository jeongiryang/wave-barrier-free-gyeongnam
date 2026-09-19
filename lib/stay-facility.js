/**
 * 숙소 편의시설 묶음 나누기(스펙 48).
 *
 * 순수 함수만 둔다. 네트워크·저장소·위치 API를 참조하지 않는다. 숙소 전용
 * 편의 키나 점수 체계를 새로 만들지 않고, 호출자가 넘긴 항목의 `key`만 보고
 * 세 묶음(들어가기/객실과 욕실/머무는 동안) 중 하나로 나눈다. 어느 묶음에도
 * 속하지 않는 키는 조용히 건너뛴다.
 *
 * 항목이 하나도 없는 묶음은 결과에 넣지 않는다(빈 묶음을 남기지 않는다).
 * `unknown` 상태 항목도 그대로 포함한다. 미확인을 없음으로 바꾸지 않는다.
 */
const GROUP_BY_KEY = {
  route: "entry",
  elevator: "entry",
  parking: "entry",
  restroom: "room",
  hearingroom: "room",
  checkIn: "stay",
  checkOut: "stay",
};

const GROUP_TITLES = { entry: "들어가기", room: "객실과 욕실", stay: "머무는 동안" };
const ORDER = ["entry", "room", "stay"];

export function groupStayFacilities(items = []) {
  const buckets = { entry: [], room: [], stay: [] };
  for (const item of Array.isArray(items) ? items : []) {
    const groupId = item && GROUP_BY_KEY[item.key];
    if (!groupId) continue;
    const entry = { key: item.key, label: item.label, state: item.state };
    if (item.detail) entry.detail = item.detail;
    buckets[groupId].push(entry);
  }
  return ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id, title: GROUP_TITLES[id], items: buckets[id],
  }));
}

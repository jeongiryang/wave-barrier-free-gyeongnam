/** Comparison contains references to the current results, never copied facility claims. */
export function toggleComparison(ids, id, availableIds) {
  const available = new Set(availableIds);
  const current = [...new Set(ids)].filter(value => available.has(value)).slice(0, 3);
  if (!available.has(id)) return current;
  return current.includes(id) ? current.filter(value => value !== id) : current.length < 3 ? [...current, id] : current;
}

export function facilityComparison(places, requestedKeys = []) {
  const labels = new Map(requestedKeys.map(key => [key, facilityLabels[key] || key]));
  for (const place of places) for (const item of place.accessibility || []) labels.set(item.key, item.label || item.key);
  return [...labels].map(([key, label]) => ({ key, label, values: places.map(place => {
    const item = place.accessibility?.find(record => record.key === key);
    // TourAPI embeds line breaks in evidence text. Match the server clean()
    // break handling without importing server request code or interpreting HTML.
    const detail = typeof item?.detail === "string" ? item.detail.replace(/<br\s*\/?\s*>/gi, " ").replace(/\s+/g, " ").trim() : "";
    return item ? { state: item.state, detail } : { state: "unknown", detail: "" };
  }) }));
}

const facilityLabels = { parking: "장애인 주차", route: "접근로", wheelchair: "휠체어 대여", elevator: "승강기", restroom: "장애인 화장실", stroller: "유모차 대여", lactationroom: "수유실", babysparechair: "유아용 의자", braileblock: "점자블록", helpdog: "안내견", guidehuman: "안내요원", audioguide: "음성 안내", bigprint: "큰활자 안내", signguide: "수어 안내", videoguide: "영상 안내", hearingroom: "청각장애인 편의" };

export const inquiryOptions = [
  { id: "hours", label: "운영·입장 시간", question: "방문할 수 있는 시간과 마지막 입장 시간을 알려주세요.", keys: [] },
  { id: "stepfree", label: "계단 없는 이동", question: "계단 없이 들어갈 수 있는 입구와 이동 경로를 알려주세요.", keys: ["route", "exit", "wheelchair"] },
  { id: "toilet", label: "이용 가능한 화장실", question: "휠체어 이용이 가능한 화장실의 위치와 운영 여부를 알려주세요.", keys: ["restroom"] },
  { id: "parking", label: "주차·승하차", question: "주차장에서 입구까지의 이동과 가까운 승하차 위치를 알려주세요.", keys: ["parking"] },
  { id: "elevator", label: "승강기", question: "이용할 수 있는 승강기의 위치와 현재 운영 여부를 알려주세요.", keys: ["elevator"] },
  { id: "rest", label: "앉아서 쉬기", question: "잠시 앉아서 쉴 수 있는 공간이 어디에 있나요?", keys: [] },
  { id: "guidance", label: "글·쉬운 안내", question: "이용 방법을 글이나 알기 쉬운 설명으로 안내받을 수 있나요?", keys: ["signguide", "videoguide", "audioguide", "braileblock"] },
  { id: "ordering", label: "사람에게 주문", question: "무인 주문기만 있나요? 사람에게 주문할 수도 있나요?", keys: [] },
  // 스펙 44: 1인 메뉴·단체석·좌석 형태를 주는 공공데이터가 없어 거르기 대신
  // 문의 항목으로만 추가한다. `keys`를 비워 두어 `defaultInquiryOptions`가
  // 확인된 편의 필드로 자동 선택하지 않는다(세 항목 모두 기본 선택 아님).
  // `좌석 형태`는 접근성과 직접 관련되므로 바로 위 접근성 질문(`guidance`)
  // 다음에 둔다. 기존 일곱 항목의 순서와 문구는 바꾸지 않았다.
  { id: "seating", label: "좌석 형태", question: "의자가 있는 자리가 있나요? 좌식만 있나요?", keys: [] },
  { id: "solo", label: "1인 주문", question: "혼자 먹을 수 있는 메뉴가 있나요?", keys: [] },
  { id: "groupSeating", label: "여럿 자리", question: "여러 명이 함께 앉을 자리가 있나요?", keys: [] },
  { id: "door", label: "출입문", question: "출입문이 회전문인가요? 옆에 여닫이문이나 자동문이 있나요?", keys: [] },
];

export function defaultInquiryOptions(place) {
  const unknown = new Set((place.accessibility || []).filter(item => item.state !== "confirmed").map(item => item.key));
  return ["hours", ...inquiryOptions.filter(option => option.keys.some(key => unknown.has(key))).map(option => option.id)];
}

export function inquiryText(placeName, selected, extra = "") {
  const questions = inquiryOptions.filter(option => selected.includes(option.id)).map(option => option.question);
  const note = String(extra).trim().slice(0, 500);
  return [`안녕하세요. ${String(placeName).slice(0, 120)}에 방문하려고 합니다.`, ...questions, ...(note ? [note] : []), "알기 쉬운 말이나 글로 안내해 주세요. 감사합니다."].join("\n\n");
}

/** Comparison contains references to the current results, never copied facility claims. */
export function toggleComparison(ids, id, availableIds) {
  const available = new Set(availableIds);
  const current = [...new Set(ids)].filter(value => available.has(value)).slice(0, 3);
  if (!available.has(id)) return current;
  return current.includes(id) ? current.filter(value => value !== id) : current.length < 3 ? [...current, id] : current;
}

export function facilityComparison(places, requestedKeys = []) {
  const labels = new Map(requestedKeys.map(key => [key, key]));
  for (const place of places) for (const item of place.accessibility || []) labels.set(item.key, item.label || item.key);
  return [...labels].map(([key, label]) => ({ key, label, values: places.map(place => {
    const item = place.accessibility?.find(record => record.key === key);
    return item ? { state: item.state, detail: item.detail || "" } : { state: "unknown", detail: "" };
  }) }));
}

export const inquiryOptions = [
  { id: "hours", label: "운영·입장 시간", question: "방문할 수 있는 시간과 마지막 입장 시간을 알려주세요.", keys: [] },
  { id: "stepfree", label: "계단 없는 이동", question: "계단 없이 들어갈 수 있는 입구와 이동 경로를 알려주세요.", keys: ["route", "exit", "wheelchair"] },
  { id: "toilet", label: "이용 가능한 화장실", question: "휠체어 이용이 가능한 화장실의 위치와 운영 여부를 알려주세요.", keys: ["restroom"] },
  { id: "parking", label: "주차·승하차", question: "주차장에서 입구까지의 이동과 가까운 승하차 위치를 알려주세요.", keys: ["parking"] },
  { id: "elevator", label: "승강기", question: "이용할 수 있는 승강기의 위치와 현재 운영 여부를 알려주세요.", keys: ["elevator"] },
  { id: "rest", label: "앉아서 쉬기", question: "잠시 앉아서 쉴 수 있는 공간이 어디에 있나요?", keys: [] },
  { id: "guidance", label: "글·쉬운 안내", question: "이용 방법을 글이나 알기 쉬운 설명으로 안내받을 수 있나요?", keys: ["signguide", "videoguide", "audioguide", "brailleblock"] },
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

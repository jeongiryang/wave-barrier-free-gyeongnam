// Translate only messages authored by this app. Keep unknown provider text intact.
// Resolve at render time so a language change does not recreate the map or its state.
const notices: Record<string, string> = {
  "카카오 지도를 연결하고 있습니다.": "Connecting to Kakao Maps.",
  "카카오 지도로 표시 중입니다.": "Showing Kakao Maps.",
  "기본 지도를 불러오지 못해 대체 지도를 표시합니다.": "The main map is unavailable. Showing an alternative map.",
  "기본 지도 연결이 지연되어 대체 지도를 표시합니다.": "The main map is taking too long to connect. Showing an alternative map.",
  "지도를 불러오지 못했습니다.": "The map could not be loaded.",
  "로드뷰는 카카오 지도 연결 상태에서만 제공됩니다.": "Roadview is available only when Kakao Maps is connected.",
  "지도에서 새 출발지를 클릭하세요.": "Click the map to choose a new departure point.",
  "지도에서 새 목적지를 클릭하세요.": "Click the map to choose a new destination.",
  "새 출발지를 설정했습니다.": "New departure point selected.",
  "새 목적지를 설정했습니다.": "New destination selected.",
  "지도 위치 선택을 취소했습니다.": "Map point selection cancelled.",
  "현재 브라우저에서 위치 기능을 사용할 수 없습니다.": "Location is unavailable in this browser.",
  "현재 위치로 지도를 이동했습니다.": "The map has moved to your current location.",
  "위치 권한을 허용하면 현재 위치로 이동할 수 있습니다.": "Allow location access to move to your current location.",
  "지도에 담을 여행지가 아직 없습니다.": "There are no places on the map to add yet.",
  "지도에 표시된 여행지는 이미 내 일정에 있어요.": "The places on the map are already in your itinerary.",
  "지도를 클릭해 거리를 그리세요.": "Click the map to measure a distance.",
  "지도를 드래그해 반경을 그리세요.": "Drag on the map to measure a radius.",
  "지도를 클릭해 면적을 그리세요.": "Click the map to measure an area.",
  "지도 위 측정 도형을 지웠습니다.": "Map measurements cleared.",
};

export function mapStatusText(message: string, english: boolean): string {
  if (!english) return message;
  if (Object.hasOwn(notices, message)) return notices[message];
  const place = message.match(/^([\s\S]+)을 (출발지|목적지)로 설정했습니다\.$/);
  if (place) return `${place[2] === "출발지" ? "Departure" : "Destination"} set to ${place[1]}.`;
  const added = message.match(/^지도에 표시된 ([1-9]\d*)곳을 내 일정에 추가했어요\.$/);
  if (added) return `Added ${added[1]} ${added[1] === "1" ? "place" : "places"} from the map to your itinerary.`;
  return message;
}

export function mapTextLanguage(text: string, english: boolean): "ko" | "en" {
  return /[가-힣]/.test(text) ? "ko" : /[A-Za-z]/.test(text) ? "en" : english ? "en" : "ko";
}

export function mapStatusParts(message: string, english: boolean) {
  const place = message.match(/^([\s\S]+)을 (출발지|목적지)로 설정했습니다\.$/);
  if (place) return [
    ...(english ? [{ text: `${place[2] === "출발지" ? "Departure" : "Destination"} set to `, lang: "en" }] : []),
    { text: place[1], lang: mapTextLanguage(place[1], english) },
    { text: english ? "." : `을 ${place[2]}로 설정했습니다.`, lang: english ? "en" : "ko" },
  ];
  const text = mapStatusText(message, english);
  return [{ text, lang: mapTextLanguage(text, english) }];
}

const crowdCopy: Record<string, { label: string; message: string }> = {
  low: { label: "Quiet", message: "A relatively quiet visit is expected." },
  moderate: { label: "Moderate", message: "Typical visitor numbers are expected. Check popular visiting times." },
  busy: { label: "Busy", message: "More visitors are expected. Consider an earlier visit." },
  "very-busy": { label: "Very busy", message: "Crowding is expected. Consider another place or time." },
};

export function mapCrowdText(visual: { level: string; label: string; message: string }, english: boolean) {
  return english && Object.hasOwn(crowdCopy, visual.level) ? crowdCopy[visual.level] : visual;
}

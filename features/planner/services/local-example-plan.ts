import type { PlanData, Place } from "../types";

const examplePlaces = (region: string): Place[] => [
  {
    id: "9900000001", contentTypeId: "12", city: region, name: `${region} 예시 정원`,
    address: `${region} 시연용 주소 1 · 실제 장소가 아닙니다`,
    summary: "API 연결 없이 카드와 상세 화면을 확인하기 위한 로컬 예시입니다.",
    image: "/media/demo/garden-illustration.webp", mapX: "128.102", mapY: "35.181", score: null,
    accessibility: [
      { key: "route", label: "접근로", state: "unknown", detail: "로컬 예시 데이터 · 실제 시설 정보가 아닙니다." },
      { key: "restroom", label: "장애인 화장실", state: "unknown", detail: "로컬 예시 데이터 · 실제 시설 정보가 아닙니다." },
    ],
    features: [], details: ["로컬 예시 데이터이며 방문에 사용할 수 없습니다."],
    source: "로컬 예시 데이터 · 실제 관광정보 아님",
  },
  {
    id: "9900000002", contentTypeId: "14", city: region, name: `${region} 예시 문화공간`,
    address: `${region} 시연용 주소 2 · 실제 장소가 아닙니다`,
    summary: "사진과 정보 영역, 정보 보기, 일정 담기 배치를 확인하는 예시입니다.",
    image: "/media/demo/coast-illustration.webp", mapX: "", mapY: "", score: null,
    accessibility: [
      { key: "wheelchair", label: "휠체어 이동", state: "unknown", detail: "로컬 예시 데이터 · 실제 시설 정보가 아닙니다." },
      { key: "restroom", label: "장애인 화장실", state: "unknown", detail: "로컬 예시 데이터 · 실제 시설 정보가 아닙니다." },
    ],
    features: [], details: ["좌표가 없는 경우의 시연용 위치 핀을 확인할 수 있습니다."],
    source: "로컬 예시 데이터 · 실제 관광정보 아님",
  },
];

export function localExamplePlan(region: string, facilityKeys: string[]): PlanData {
  const places = examplePlaces(region);
  return {
    criteria: { facilityKeys }, mode: "fallback", generatedAt: new Date().toISOString(), baseYm: "", places,
    explorationPlaces: [], excludedPlaces: [],
    pagination: { page: 1, nextPage: null, hasMore: false, scope: "loaded-candidates" },
    course: null, audio: null, photo: null, crowd: null,
    stops: places.map(place => ({ id: place.id, contentTypeId: place.contentTypeId, mapX: place.mapX, mapY: place.mapY, title: place.name, note: place.summary, source: place.source, evidenceState: "context" })),
    statuses: [{ id: "local-example", name: "로컬 예시 데이터", role: "화면 확인 전용", state: "ready", count: places.length, note: "API 연결 실패로 로컬에서만 표시" }],
  };
}

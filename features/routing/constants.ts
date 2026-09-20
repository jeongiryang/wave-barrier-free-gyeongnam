export const nearbyCategories = [
  { id: "food", label: "음식점", icon: "🍴", code: "FD6" },
  { id: "stay", label: "숙박", icon: "🛏", code: "AD5" },
  { id: "attraction", label: "관광명소", icon: "✦", code: "AT4" },
  { id: "bus", label: "버스", icon: "▣", keyword: "버스정류장" },
  { id: "subway", label: "지하철", icon: "▤", code: "SW8" },
  { id: "parking", label: "주차장", icon: "P", code: "PK6" },
  { id: "pharmacy", label: "약국", icon: "✚", code: "PM9" },
  { id: "hospital", label: "병원", icon: "H", code: "HP8" },
  { id: "bank", label: "은행·ATM", icon: "₩", code: "BK9" },
  { id: "cafe", label: "카페", icon: "☕", code: "CE7" },
  { id: "store", label: "편의점", icon: "24", code: "CS2" },
  { id: "mart", label: "대형마트", icon: "▦", code: "MT1" },
  { id: "fuel", label: "주유·충전", icon: "⛽", code: "OL7" },
  { id: "culture", label: "문화시설", icon: "▥", code: "CT1" },
] as const;

/**
 * 편의시설 레이어의 근거 구분.
 *
 * - `place-search`: 카카오 장소 검색(브라우저 SDK). 지도 중심 기준으로 찾는다.
 * - `official`: 공공데이터 제공처를 서버 경유로 조회한 결과.
 *
 * 두 갈래는 화면에서 섞지 않는다. 근거의 성격이 다르기 때문이다.
 *
 * - `derived`: 새 조회를 하지 않고 **이미 받아온 장소 목록**(`MapPlace.accessibility`)에서
 *   조건에 맞는 곳만 걸러 마커로 그린다. 스펙 20(안내견 동반)이 이 갈래를 쓴다.
 */
export type FacilityLayerSource = "official" | "place-search" | "derived";

export type FacilityLayer = {
  id: string;
  /** 화면 문구. 시설 이름으로만 쓴다. */
  label: string;
  source: FacilityLayerSource;
  /** place-search 전용. nearbyCategories 의 코드를 그대로 쓴다. */
  code?: string;
  /** official 전용. /api/wave 의 action 값. */
  action?: string;
  /** derived 전용. 장소의 `accessibility` 배열에서 `state === "confirmed"`인 항목을 찾을 key. */
  derivedKey?: string;
  /** 마커·범례에서 색이 아닌 글자로 종류를 알리는 짧은 기호. */
  glyph: string;
};

/**
 * 카카오 장소 검색 레이어. 코드는 `nearbyCategories`의 것을 그대로 쓴다.
 * 이 작업에서 새 카테고리 코드를 만들지 않는다.
 */
export const placeSearchFacilityLayers: readonly FacilityLayer[] = [
  { id: "food", label: "음식점", source: "place-search", code: "FD6", glyph: "식" },
  { id: "cafe", label: "카페", source: "place-search", code: "CE7", glyph: "카" },
  { id: "store", label: "편의점", source: "place-search", code: "CS2", glyph: "편" },
  { id: "pharmacy", label: "약국", source: "place-search", code: "PM9", glyph: "약" },
  { id: "hospital", label: "병원", source: "place-search", code: "HP8", glyph: "병" },
  { id: "subway", label: "지하철역", source: "place-search", code: "SW8", glyph: "역" },
];

/** 서버가 공개 관광지 ID를 재검증한 뒤 돌려주는 공식 공공데이터 레이어. */
export const officialFacilityLayers: readonly FacilityLayer[] = [
  { id: "trash-bin", label: "쓰레기통", source: "official", action: "trash-bin", glyph: "휴" },
];

/**
 * 이미 조회한 장소 목록에서 파생하는 레이어(스펙 20). 새 서버 호출이나 새
 * 제공처를 더하지 않는다. `helpdog`는 `KorWithService2/detailWithTour2`가
 * 이미 주는 필드이고 `FACILITIES`·`profileFields`에 이미 연동돼 있다.
 */
export const derivedFacilityLayers: readonly FacilityLayer[] = [
  { id: "helpdog-confirmed", label: "안내견 동반이 확인된 곳", source: "derived", derivedKey: "helpdog", glyph: "견" },
  // 스펙 14: `braileblock`도 `KorWithService2/detailWithTour2`가 이미 주는
  // 필드이고 `FACILITIES`·`profileFields`에 이미 연동돼 있다. 새 서버 호출을
  // 만들지 않고 이미 받아온 장소 목록에서만 파생한다.
  { id: "braileblock-confirmed", label: "점자블록이 확인된 곳", source: "derived", derivedKey: "braileblock", glyph: "점" },
];

export const facilityLayers: readonly FacilityLayer[] = [
  ...placeSearchFacilityLayers,
  ...officialFacilityLayers,
  ...derivedFacilityLayers,
];

/** 한 번에 켤 수 있는 레이어 수. 5번째는 켜진 것을 끄지 않고 안내만 한다. */
export const FACILITY_LAYER_LIMIT = 4;

/** 지도에 한 번에 그리는 마커 총량. 초과분은 그리지 않고 알린다. */
export const FACILITY_MARKER_CAP = 60;

export const overlayLayers = [
  { id: "TRAFFIC", label: "교통정보", icon: "🚦" },
  { id: "BICYCLE", label: "자전거", icon: "🚲" },
  { id: "TERRAIN", label: "지형도", icon: "⛰" },
  { id: "USE_DISTRICT", label: "지적편집도", icon: "◇" },
] as const;

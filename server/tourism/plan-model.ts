import { apiStatus } from "./provider-model";
import type { ProviderAttempt } from "../shared/provider-data";

type EvidencePlace = {
  id?: string;
  contentTypeId?: string;
  mapX?: string;
  mapY?: string;
  name: string;
  score: number | null;
  knownFields?: number;
  summary: string;
  source: string;
  features: string[];
};

type PlanStop = {
  id?: string;
  contentTypeId?: string;
  mapX?: string;
  mapY?: string;
  title: string;
  note: string;
  source: string;
  evidenceState: "verified" | "limited" | "context";
};

export function hasPositiveOfficialEvidence(place: Pick<EvidencePlace, "score" | "knownFields">) {
  return typeof place.score === "number" && place.score > 0 && (place.knownFields ?? 0) > 0;
}

export function partitionPlacesByEvidence<T extends Pick<EvidencePlace, "score" | "knownFields">>(places: T[]) {
  return places.reduce<{ recommended: T[]; exploration: T[] }>((groups, place) => {
    groups[hasPositiveOfficialEvidence(place) ? "recommended" : "exploration"].push(place);
    return groups;
  }, { recommended: [], exploration: [] });
}

export function sortPlacesByEvidence<T extends Pick<EvidencePlace, "score" | "knownFields">>(places: T[]) {
  return places.sort((left, right) => {
    const leftVerified = left.score === null ? 0 : 1;
    const rightVerified = right.score === null ? 0 : 1;
    return rightVerified - leftVerified
      || (right.score ?? -1) - (left.score ?? -1)
      || (right.knownFields ?? 0) - (left.knownFields ?? 0);
  });
}

export function buildPlanStops(places: EvidencePlace[]) {
  const stops: PlanStop[] = places.filter(hasPositiveOfficialEvidence).slice(0, 4).map((place, index) => ({
    title: place.name,
    note: index === 0 ? `${place.features.slice(0, 2).join("·")} 편의정보가 공식 데이터에서 확인됐습니다.` : place.summary,
    source: place.source,
    id: place.id,
    contentTypeId: place.contentTypeId,
    mapX: place.mapX,
    mapY: place.mapY,
    evidenceState: "verified",
  }));
  return stops;
}

export function buildPlanStatuses(input: {
  barrier: ProviderAttempt; tour: ProviderAttempt; audio: ProviderAttempt; durunubi: ProviderAttempt;
  hub: ProviderAttempt; photo: ProviderAttempt; related: ProviderAttempt; crowd: ProviderAttempt;
  detailCount: number; language: { name: string; source: string };
}) {
  const statuses = [
    apiStatus("barrierfree", "무장애 여행정보", "주차·접근로·휠체어·화장실 등 상세 편의정보", input.barrier, input.detailCount),
    apiStatus("tour", input.language.name, `${input.language.source} 관광지 좌표·이미지·주소와 지역 기반 검색`, input.tour),
    apiStatus("audio", "관광지 오디오 가이드", "관광 해설 음원과 청각 지원용 전체 대본", input.audio),
    apiStatus("durunubi", "두루누비 정보", "걷기 코스 거리·시간·난이도와 여행자 정보", input.durunubi),
    apiStatus("hub", "기초지자체 중심 관광지", "지역 안에서 연결성이 높은 중심 관광지 순위", input.hub),
    apiStatus("photo", "관광사진 정보", "지역·축제 키워드 기반 관광사진과 촬영 출처", input.photo),
    apiStatus("related", "관광지별 연관 관광지", "함께 방문하기 좋은 관광·음식·숙박 후보", input.related),
    apiStatus("crowd", "관광지 집중률 예측", "향후 30일 관광객 집중률과 혼잡 회피 근거", input.crowd),
  ];
  const live = statuses.filter((status) => status.state === "live").length;
  return { statuses, mode: live === statuses.length ? "live" : live ? "partial" : "fallback" };
}

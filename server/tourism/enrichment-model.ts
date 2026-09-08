import { clean } from "../shared/http";
import type { ProviderAttempt as Attempt } from "../shared/provider-data";
import type { fetchEnrichmentSources } from "./enrichment-sources";
import { richSpot } from "./content-model";
import { apiStatus } from "./provider-model";

type EnrichmentSources = Awaited<ReturnType<typeof fetchEnrichmentSources>>;

function spots(result: Attempt, source: string) {
  return result.ok
    ? result.value.items.map((item) => richSpot(item, source)).filter((item) => item.title && item.title !== "이름 없는 콘텐츠").slice(0, 8)
    : [];
}

export function buildEnrichmentModel(sources: EnrichmentSources, expresswayConfigured: boolean) {
  const {
    language, visitorPack, camping, pet, wellness, medical, languageTour, awards, demandPack,
    waterCourses, waterPlaces, themeRests, events, lodging,
  } = sources;
  const visitorItems = visitorPack.result.ok ? visitorPack.result.value.items : [];
  const visitorTotal = Math.round(visitorItems.reduce((sum, item) => sum + Number(item.touNum || 0), 0));
  const visitorByType = visitorItems.reduce<Record<string, number>>((acc, item) => {
    const name = clean(item.touDivNm || "방문자");
    acc[name] = (acc[name] || 0) + Number(item.touNum || 0);
    return acc;
  }, {});
  const demandItems = demandPack.result.ok ? demandPack.result.value.items : [];
  const statuses = [
    apiStatus("visitor", "지역별 방문자수", "최근 7일 방문 흐름과 방문자 구성", visitorPack.result, visitorItems.length),
    apiStatus("camping", "고캠핑", "지역 캠핑장과 운영·시설 정보", camping),
    apiStatus("pet", "반려동물 동반여행", "반려동물과 함께 갈 수 있는 관광·숙박·음식", pet),
    apiStatus("wellness", "웰니스 관광", "휴식·명상·스파·자연치유 여행 후보", wellness),
    apiStatus("medical", "의료 관광", "의료 관광시설과 안전 보조 정보", medical),
    apiStatus("language", language.name, `${language.source} 공식 관광 안내`, languageTour),
    apiStatus("award", "관광공모전 수상사진", "조회된 사진 중 경남 촬영지가 확인된 자료", awards),
    apiStatus("demand", "관광 자원 수요", "SNS·소비·내비게이션 기반 지역 수요 지표", demandPack.result, demandItems.length),
    apiStatus("water", "물과 여행", "낙동강 수변 코스와 주요 명소", waterCourses.ok || waterPlaces.ok ? { ok: true, value: { items: [...(waterCourses.ok ? waterCourses.value.items : []), ...(waterPlaces.ok ? waterPlaces.value.items : [])], total: 0 } } : waterCourses),
    expresswayConfigured
      ? apiStatus("rest", "테마휴게소", "조회된 휴게소 중 경남 주소가 확인된 휴식 지점", themeRests)
      : { id: "rest", name: "테마휴게소", role: "관광·문화·체험형 고속도로 휴식 지점", state: "ready", count: 0, note: "선택 기능 · 한국도로공사 전용키 연결 시 활성화" },
    apiStatus("event", "축제·행사", "현재부터 열리는 지역 축제·공연·문화행사", events),
    apiStatus("lodging", "숙박", "여행 지역의 숙박시설과 위치 정보", lodging),
  ];
  return {
    generatedAt: new Date().toISOString(),
    visitor: { total: visitorTotal, byType: visitorByType, startYmd: visitorPack.startYmd, endYmd: visitorPack.endYmd },
    demand: demandItems.map((item) => ({ name: clean(item.tarSvcDemIxNm), value: Number(item.tarSvcDemIxVal || 0), baseYm: clean(item.baseYm || demandPack.baseYm) })).slice(0, 8),
    camping: spots(camping, "고캠핑"), pet: spots(pet, "반려동물 동반여행"), wellness: spots(wellness, "웰니스 관광"),
    medical: spots(medical, "의료 관광"), language: spots(languageTour, language.source), awards: spots(awards, "관광공모전 수상작"),
    water: [...spots(waterCourses, "낙동강 수변 코스"), ...spots(waterPlaces, "낙동강 수변 명소")].slice(0, 8),
    rests: spots(themeRests, "한국도로공사 테마휴게소"), events: spots(events, "지역 축제·행사"), lodging: spots(lodging, "국문 관광정보 · 숙박"),
    statuses,
  };
}

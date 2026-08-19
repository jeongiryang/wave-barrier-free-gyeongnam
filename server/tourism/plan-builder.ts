import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import {
  attemptProvider as attempt,
  commonParams,
  fetchRegionalList,
  fetchTourismData as fetchKto,
} from "../shared/provider-data";
import { contentTypes, languageServices, profileFields, regionCodes } from "./catalog";
import { fetchCrowd, fetchHub, fetchRelated } from "./insights";
import { placeFrom } from "./accessibility-model";
import { audioFrom, courseFrom } from "./content-model";
import { apiStatus, mergePlaces } from "./provider-model";
import { fetchPhoto, photoFrom } from "./photos";

export async function buildPlan(request: Request, env: Env) {
  const url = new URL(request.url);
  const requestedRegion = clean(url.searchParams.get("region"), 20);
  const region = regionCodes[requestedRegion] ? requestedRegion : "창원";
  const theme = contentTypes[clean(url.searchParams.get("theme"), 20)] ? clean(url.searchParams.get("theme"), 20) : "nature";
  const locale = languageServices[clean(url.searchParams.get("locale"), 20)] ? clean(url.searchParams.get("locale"), 20) : "ko";
  const language = languageServices[locale];
  const profiles = clean(url.searchParams.get("profiles"), 100).split(",").filter((item) => profileFields[item]).slice(0, 6);
  const districts = regionCodes[region].legal;
  const locationParams = {
    ...commonParams("12"),
    arrange: "Q",
    contentTypeId: contentTypes[theme],
    lDongRegnCd: "48",
  };

  const [barrier, tour, durunubi, hubPack, photo] = await Promise.all([
    fetchRegionalList(env, "KorWithService2", "areaBasedList2", locationParams, districts),
    fetchRegionalList(env, language.service, "areaBasedList2", locale === "ko" ? locationParams : { ...commonParams("12"), arrange: "Q", lDongRegnCd: "48" }, districts),
    attempt(fetchKto(env, "Durunubi", "courseList", {
      ...commonParams("10"), brdDiv: "DNWW", crsLevel: "1", ...(region !== "경남 전체" ? { crsKorNm: region } : {}),
    })),
    fetchHub(env, region),
    fetchPhoto(env, region),
  ]);

  const baseItems = mergePlaces(barrier.ok ? barrier.value.items : [], tour.ok ? tour.value.items : []).slice(0, 6);
  const details = await Promise.all(baseItems.map((item) => attempt(fetchKto(env, "KorWithService2", "detailWithTour2", {
    ...commonParams("1"), contentId: clean(item.contentid),
  }))));
  // 원본 API의 인기 정렬보다 사용자가 선택한 편의조건의 공식 확인 근거를
  // 우선한다. 근거 없는 후보도 숨기지는 않되 첫 추천·자동 경로 뒤로 보낸다.
  const places = baseItems
    .map((item, index) => placeFrom(item, details[index]?.ok ? details[index].value.items[0] || {} : {}, region, profiles, index))
    .sort((left, right) => {
      const leftVerified = left.score === null ? 0 : 1;
      const rightVerified = right.score === null ? 0 : 1;
      return rightVerified - leftVerified
        || (right.score ?? -1) - (left.score ?? -1)
        || (right.knownFields ?? 0) - (left.knownFields ?? 0);
    });

  const firstTitle = places[0]?.name || region;
  const [audio, relatedPack, crowd] = await Promise.all([
    attempt(fetchKto(env, "Odii", "storySearchList", { ...commonParams("5"), langCode: language.audio, keyword: firstTitle })),
    fetchRelated(env, region, hubPack.baseYm),
    fetchCrowd(env, region, firstTitle),
  ]);
  const course = courseFrom(durunubi);
  const hubItems = hubPack.result.ok ? hubPack.result.value.items : [];
  const stops = places.slice(0, 3).map((place, index) => ({
    title: place.name,
    note: place.score === null
      ? "공식 편의정보가 부족한 후보입니다. 방문 전 시설 운영기관에 확인해 주세요."
      : index === 0
        ? `${place.features.slice(0, 2).join("·")} 편의정보가 공식 데이터에서 확인됐습니다.`
        : place.summary,
    source: place.source,
    evidenceState: place.score === null ? "limited" : "verified",
  }));
  hubItems.slice(0, Math.max(0, 3 - stops.length)).forEach((item) => stops.push({
    title: clean(item.hubTatsNm),
    note: `${clean(item.signguNm || region)} 중심관광지 ${clean(item.hubRank)}순위로 연결성이 높은 후보입니다.`,
    source: `기초지자체 중심 관광지 · ${hubPack.baseYm}`,
    evidenceState: "context",
  }));
  if (stops.length < 4 && relatedPack.result.ok) {
    relatedPack.result.value.items.slice(0, 4 - stops.length).forEach((item) => stops.push({
      title: clean(item.rlteTatsNm),
      note: `${clean(item.tAtsNm || firstTitle)}와 함께 찾는 연관 관광지 ${clean(item.rlteRank || "")}순위 후보입니다.`,
      source: `연관 관광지 · ${relatedPack.baseYm}`,
      evidenceState: "context",
    }));
  }
  if (course && stops.length < 4) stops.push({ title: course.name, note: course.summary, source: "두루누비 걷기 코스", evidenceState: "context" });

  const statuses = [
    apiStatus("barrierfree", "무장애 여행정보", "주차·접근로·휠체어·화장실 등 상세 편의정보", barrier, details.filter((item) => item.ok && item.value.items.length).length),
    apiStatus("tour", language.name, `${language.source} 관광지 좌표·이미지·주소와 지역 기반 검색`, tour),
    apiStatus("audio", "관광지 오디오 가이드", "관광 해설 음원과 청각 지원용 전체 대본", audio),
    apiStatus("durunubi", "두루누비 정보", "걷기 코스 거리·시간·난이도와 여행자 정보", durunubi),
    apiStatus("hub", "기초지자체 중심 관광지", "지역 안에서 연결성이 높은 중심 관광지 순위", hubPack.result),
    apiStatus("photo", "관광사진 정보", "지역·축제 키워드 기반 관광사진과 촬영 출처", photo),
    apiStatus("related", "관광지별 연관 관광지", "함께 방문하기 좋은 관광·음식·숙박 후보", relatedPack.result),
    apiStatus("crowd", "관광지 집중률 예측", "향후 30일 관광객 집중률과 혼잡 회피 근거", crowd),
  ];
  const live = statuses.filter((status) => status.state === "live").length;

  return {
    mode: live === statuses.length ? "live" : live ? "partial" : "fallback",
    generatedAt: new Date().toISOString(),
    baseYm: hubPack.baseYm,
    places,
    course,
    audio: audioFrom(audio),
    photo: photoFrom(photo, region),
    crowd: crowd.ok && crowd.value.items.length ? {
      rate: Number(crowd.value.items[0].cnctrRate || 0),
      baseYmd: clean(crowd.value.items[0].baseYmd),
      place: clean(crowd.value.items[0].tAtsNm || firstTitle),
    } : null,
    stops,
    statuses,
  };
}

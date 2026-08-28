import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import {
  attemptProvider as attempt,
  commonParams,
  fetchRegionalList,
  fetchTourismData as fetchKto,
} from "../shared/provider-data";
import { fetchCrowd, fetchHub, fetchRelated } from "./insights";
import { placeFrom } from "./accessibility-model";
import { audioFrom, courseFrom } from "./content-model";
import { buildPlanStatuses, buildPlanStops, sortPlacesByEvidence } from "./plan-model";
import { readPlanQuery } from "./plan-query";
import { mergePlaces } from "./provider-model";
import { fetchPhoto, photoFrom } from "./photos";
import { recordOperationalEvent } from "../shared/observability";

export async function buildPlan(request: Request, env: Env) {
  const { region, locale, language, profiles, districts, locationParams } = readPlanQuery(request);

  const [barrier, tour, durunubi, hubPack, photo] = await Promise.all([
    fetchRegionalList(env, "KorWithService2", "areaBasedList2", locationParams, districts),
    // 국문·다국어 서비스는 같은 조건으로 조회해야 한다. 다국어 쪽에서
    // contentTypeId를 빼면 사용자가 고른 테마와 무관한 장소가 섞여 들어와,
    // 테마를 바꿔도 결과가 그대로인 것처럼 보인다.
    fetchRegionalList(env, language.service, "areaBasedList2", locationParams, districts),
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
  const places = sortPlacesByEvidence(baseItems
    .map((item, index) => placeFrom(item, details[index]?.ok ? details[index].value.items[0] || {} : {}, region, profiles, index)));

  const firstTitle = places[0]?.name || region;
  const [audio, relatedPack, crowd] = await Promise.all([
    attempt(fetchKto(env, "Odii", "storySearchList", { ...commonParams("5"), langCode: language.audio, keyword: firstTitle })),
    fetchRelated(env, region, hubPack.baseYm),
    fetchCrowd(env, region, firstTitle),
  ]);
  const course = courseFrom(durunubi);
  const hubItems = hubPack.result.ok ? hubPack.result.value.items : [];
  const stops = buildPlanStops(places, hubItems, relatedPack.result, relatedPack.baseYm, region, firstTitle, course);
  const { statuses, mode } = buildPlanStatuses({
    barrier, tour, audio, durunubi, hub: hubPack.result, photo, related: relatedPack.result, crowd,
    detailCount: details.filter((item) => item.ok && item.value.items.length).length,
    language,
  });

  const result = {
    mode,
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
  recordOperationalEvent("tourism_plan", {
    region,
    locale,
    mode,
    places: places.length,
    images: places.filter((place) => Boolean(place.image)).length,
    providersOk: statuses.filter((status) => status.state === "live").length,
    providersFailed: statuses.filter((status) => status.state === "error").length,
  });
  return result;
}

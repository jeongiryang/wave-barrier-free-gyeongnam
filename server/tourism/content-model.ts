import { clean } from "../shared/http";
import type { ProviderAttempt as Attempt, ProviderItem as KtoItem } from "../shared/provider-data";

function hasMeaningfulValue(value: unknown) {
  const text = clean(value);
  return Boolean(text && !/(없음|미제공|해당없음|정보 없음|불가)/.test(text));
}

export function courseFrom(result: Attempt) {
  if (!result.ok || !result.value.items.length) return null;
  const item = result.value.items[0];
  const level = clean(item.crsLevel);
  return {
    name: clean(item.crsKorNm), distance: clean(item.crsDstnc), minutes: clean(item.crsTotlRqrmHour),
    level: level === "1" ? "쉬움" : level === "2" ? "보통" : level === "3" ? "어려움" : level || "미제공",
    summary: clean(item.crsSummary || item.crsContents, 220), sigun: clean(item.sigun),
  };
}

export function richSpot(item: KtoItem, source: string) {
  const eventStart = clean(item.eventstartdate || item.eventStartDate);
  const eventEnd = clean(item.eventenddate || item.eventEndDate);
  const eventPeriod = eventStart
    ? `${eventStart.slice(0, 4)}.${eventStart.slice(4, 6)}.${eventStart.slice(6, 8)}${eventEnd && eventEnd !== eventStart ? ` – ${eventEnd.slice(0, 4)}.${eventEnd.slice(4, 6)}.${eventEnd.slice(6, 8)}` : ""}`
    : "";
  return {
    id: clean(item.contentId || item.contentid || item.contentID || item.facltNm || item.koTitle || item.stdRestCd || item.serviceAreaCode || item.travelId || item.courseId || item.title),
    title: clean(item.title || item.contentTitle || item.facltNm || item.koTitle || item.stdRestNm || item.serviceAreaName || item.travelNm || item.travelName || item.courseNm || item.courseName || item.spotNm || item.tourNm || item.name || "이름 없는 콘텐츠"),
    address: clean(item.addr1 || item.baseAddr || item.address || item.addr || item.svarAddr || item.serviceAreaAddress || item.koFilmst || item.region),
    summary: clean(eventPeriod || item.overview || item.intro || item.lineIntro || item.course || item.contents || item.content || item.description || item.themeDetail || item.themeDtl || item.featureNm || item.koKeyword, 260),
    image: clean(item.firstimage || item.firstImageUrl || item.orgImage || item.thumbImage || item.thumbnail || item.imageUrl || item.imgUrl || item.photoUrl).replace(/^http:\/\//, "https://"),
    mapX: clean(item.mapX || item.mapx || item.longitude), mapY: clean(item.mapY || item.mapy || item.latitude),
    tag: clean(item.wellnessThemaNm || item.induty || item.themeName || item.themeNm || item.koWnprzDiz || item.petTursmInfo || item.searchType || source, 80), source,
  };
}

export function audioFrom(result: Attempt) {
  if (!result.ok || !result.value.items.length) return null;
  const item = result.value.items.find((value) => hasMeaningfulValue(value.audioUrl)) || result.value.items[0];
  return {
    title: clean(item.title), audioTitle: clean(item.audioTitle || item.title),
    audioUrl: clean(item.audioUrl).replace(/^http:\/\//, "https://"),
    script: clean(item.script, 5000), playTime: clean(item.playTime),
  };
}

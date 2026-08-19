import type { Env } from "../shared/env";
import { clean, httpsUrl } from "../shared/http";
import { attemptProvider as attempt, commonParams, fetchTourismData as fetchKto } from "../shared/provider-data";
import { regionPhotoKeywords } from "./catalog";

function normalizedSearchText(value: unknown) {
  return clean(value, 120).toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function scoreSpotPhotoTitle(candidate: unknown, requestedTitle: string) {
  const candidateText = normalizedSearchText(candidate);
  const requestedText = normalizedSearchText(requestedTitle);
  if (!candidateText || !requestedText) return 0;
  if (candidateText === requestedText) return 120;
  if (candidateText.includes(requestedText) || requestedText.includes(candidateText)) return 90;
  const requestedTokens = clean(requestedTitle, 120)
    .split(/\s+/)
    .map(normalizedSearchText)
    .filter((token) => token.length >= 2);
  return requestedTokens.reduce((score, token) => score + (candidateText.includes(token) ? 12 : 0), 0);
}

export async function fetchSpotPhoto(env: Env, region: string, title: string, tag = "", contentId = "") {
  const normalizedTitle = clean(title, 80)
    .replace(/\([^)]*\)|（[^）]*）/g, " ")
    .replace(/\b(주식회사|유한회사)\b|\(주\)|지점|본점/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const keywords = [...new Set([
    clean(title, 80),
    normalizedTitle,
    clean(`${region} ${normalizedTitle}`, 80),
    clean(`${region} ${tag || "관광"}`, 80),
    clean(regionPhotoKeywords[region] || `${region} 관광`, 80),
  ].filter((value) => value.length >= 2))].slice(0, 5);

  let providerWorked = false;
  if (/^\d{3,}$/.test(contentId)) {
    const detail = await attempt(fetchKto(env, "KorService2", "detailCommon2", {
      ...commonParams("1"), contentId,
    }));
    providerWorked ||= detail.ok;
    const item = detail.ok ? detail.value.items[0] : undefined;
    const image = httpsUrl(item?.firstimage || item?.firstimage2);
    if (image) {
      return {
        image,
        source: "한국관광공사 관광정보",
        matchedTitle: clean(item?.title || title),
        query: contentId,
        status: "live",
      };
    }
  }

  // 정확한 장소명부터 순차 검색해 공공데이터 초당 호출 제한을 피한다.
  for (const keyword of keywords) {
    const [gallery, tour] = await Promise.all([
      attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", { ...commonParams("12"), arrange: "C", keyword })),
      attempt(fetchKto(env, "KorService2", "searchKeyword2", { ...commonParams("12"), arrange: "Q", keyword })),
    ]);
    providerWorked ||= gallery.ok || tour.ok;
    const candidates = [
      ...(gallery.ok ? gallery.value.items.map((item) => ({
        image: httpsUrl(item.galWebImageUrl || item.galWebImageUrl2),
        title: clean(item.galTitle),
        source: "한국관광공사 관광사진",
      })) : []),
      ...(tour.ok ? tour.value.items.map((item) => ({
        image: httpsUrl(item.firstimage || item.firstimage2),
        title: clean(item.title),
        source: "한국관광공사 관광정보",
      })) : []),
    ].filter((candidate) => candidate.image)
      .sort((left, right) => scoreSpotPhotoTitle(right.title, normalizedTitle) - scoreSpotPhotoTitle(left.title, normalizedTitle));
    const best = candidates[0];
    if (best) {
      return {
        image: best.image,
        source: best.source,
        matchedTitle: best.title || clean(title),
        query: keyword,
        status: "live",
      };
    }
  }

  return { image: "", source: "", matchedTitle: clean(title), status: providerWorked ? "empty" : "error" };
}

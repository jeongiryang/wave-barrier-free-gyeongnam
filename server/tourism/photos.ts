import type { Env } from "../shared/env";
import { clean, httpsUrl } from "../shared/http";
import {
  attemptProvider as attempt,
  commonParams,
  fetchTourismData as fetchKto,
  type ProviderAttempt as Attempt,
} from "../shared/provider-data";
import { regionPhotoFallbackKeywords, regionPhotoKeywords } from "./catalog";

export async function fetchPhoto(env: Env, region: string): Promise<Attempt> {
  const primaryKeyword = region === "경남 전체" ? "경상남도 관광" : (regionPhotoKeywords[region] || region);
  const keywords = [...new Set([
    primaryKeyword,
    ...(regionPhotoFallbackKeywords[region] || []),
    region !== "경남 전체" ? `${region} 관광` : "",
  ].filter(Boolean))];
  let providerWorked = false;
  let lastError = "관광사진 제공기관 응답을 확인하지 못했습니다.";

  for (const keyword of keywords) {
    const gallery = await attempt(fetchKto(env, "PhotoGalleryService1", "gallerySearchList1", {
      ...commonParams("12"), arrange: "C", keyword,
    }));
    providerWorked ||= gallery.ok;
    if (!gallery.ok) lastError = gallery.error;
    if (gallery.ok) {
      const usable = gallery.value.items.filter((item) => httpsUrl(item.galWebImageUrl || item.galWebImageUrl2));
      if (usable.length) return { ok: true, value: { items: usable, total: usable.length } } as Attempt;
    }

    // 관광사진 API에 등록되지 않은 지역은 같은 한국관광공사의 관광정보
    // 이미지로 보완한다. 외부 임의 이미지나 영구 저장본은 사용하지 않는다.
    const tour = await attempt(fetchKto(env, "KorService2", "searchKeyword2", {
      ...commonParams("12"), arrange: "Q", keyword,
    }));
    providerWorked ||= tour.ok;
    if (!tour.ok) lastError = tour.error;
    if (tour.ok) {
      const normalized = tour.value.items.map((item) => ({
        galContentId: item.contentid,
        galTitle: item.title,
        galWebImageUrl: httpsUrl(item.firstimage || item.firstimage2),
        galPhotographyLocation: clean(item.addr1 || region),
        galPhotographer: "한국관광공사",
        galSearchKeyword: keyword,
      })).filter((item) => item.galWebImageUrl);
      if (normalized.length) return { ok: true, value: { items: normalized, total: normalized.length } } as Attempt;
    }
  }

  return providerWorked
    ? { ok: true, value: { items: [], total: 0 } }
    : { ok: false, error: lastError };
}
function normalizedSearchText(value: unknown) {
  return clean(value, 120).toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function scoreSpotPhotoTitle(candidate: unknown, requestedTitle: string) {
  const candidateText = normalizedSearchText(candidate);
  const requestedText = normalizedSearchText(requestedTitle);
  if (!candidateText || !requestedText) return 0;
  if (candidateText === requestedText) return 120;
  if (candidateText.includes(requestedText) || requestedText.includes(candidateText)) return 90;
  const requestedTokens = clean(requestedTitle, 120).split(/\s+/).map(normalizedSearchText).filter((token) => token.length >= 2);
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

  // 정확한 장소명부터 순차 검색한다. 카드 3개가 동시에 열려도 처음부터 30건을
  // 몰아 호출하지 않아 공공데이터 초당 호출 제한을 피할 수 있다.
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


export function photoFrom(result: Attempt, region = "") {
  if (!result.ok || !result.value.items.length) return null;
  const strict = result.value.items.find((candidate) => {
    const haystack = `${clean(candidate.galTitle)} ${clean(candidate.galPhotographyLocation)} ${clean(candidate.galSearchKeyword)}`;
    return !region || region === "경남 전체" || haystack.includes(region);
  });
  const item = strict || result.value.items[0];
  return {
    id: clean(item.galContentId),
    title: clean(item.galTitle),
    image: clean(item.galWebImageUrl).replace(/^http:\/\//, "https://"),
    location: clean(item.galPhotographyLocation),
    photographer: clean(item.galPhotographer),
    month: clean(item.galPhotographyMonth),
  };
}

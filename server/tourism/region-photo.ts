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

import type { KakaoMap, KakaoSdk } from "./kakao-sdk";
import { constrainedGyeongnamViewport } from "../../lib/gyeongnam-map-viewport.js";

export function restrictKakaoViewport(map: KakaoMap, K: KakaoSdk["maps"], isCancelled: () => boolean) {
  let adjusting = false;
  map.setMaxLevel(11);
  const constrain = () => {
    if (adjusting || isCancelled()) return;
    adjusting = true;
    try {
      // A wide/fullscreen canvas needs a closer maximum zoom than a phone.
      for (let attempt = 0; attempt < 12; attempt++) {
        const center = map.getCenter(), bounds = map.getBounds();
        const sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
        const next = constrainedGyeongnamViewport(
          { lat: center.getLat(), lng: center.getLng() },
          { lat: sw.getLat(), lng: sw.getLng() },
          { lat: ne.getLat(), lng: ne.getLng() },
        );
        if (next.tooWide && map.getLevel() > 1) { map.setLevel(map.getLevel() - 1); continue; }
        if (Math.abs(next.lat - center.getLat()) > 0.000001 || Math.abs(next.lng - center.getLng()) > 0.000001) {
          map.setCenter(new K.LatLng(next.lat, next.lng));
          // Kakao's projected bounds change slightly when longitude changes.
          // Re-measure after moving so a narrow/tall canvas stays inside too.
          continue;
        }
        break;
      }
    } finally { adjusting = false; }
  };
  K.event?.addListener(map, "bounds_changed", constrain);
  return constrain;
}

export type KakaoLatLng = { getLat(): number; getLng(): number };

export type KakaoMap = {
  setBounds(bounds: unknown): void;
  setCenter(position: unknown): void;
  getCenter(): KakaoLatLng;
  panTo(position: unknown): void;
  setLevel(level: number): void;
  setMapTypeId(type: unknown): void;
  addOverlayMapTypeId(type: unknown): void;
  removeOverlayMapTypeId(type: unknown): void;
  relayout(): void;
};

export type KakaoMarker = { setMap(map: KakaoMap | null): void };
export type KakaoPlace = {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  distance: string;
  place_url: string;
};

export type KakaoDrawingManager = {
  cancel(): void;
  select(type: unknown): void;
  getOverlays(): Record<string, unknown[]>;
  remove(overlay: unknown): void;
  getData(): unknown;
  addListener(event: string, callback: () => void): void;
};

export type KakaoSdk = {
  maps: {
    load(callback: () => void): void;
    Map: new (node: HTMLElement, options: Record<string, unknown>) => KakaoMap;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => { extend(position: KakaoLatLng): void };
    Marker: new (options: Record<string, unknown>) => KakaoMarker;
    CustomOverlay: new (options: { map: KakaoMap; position: KakaoLatLng; content: HTMLElement; yAnchor?: number; xAnchor?: number }) => { setMap(map: KakaoMap | null): void };
    Polyline: new (options: Record<string, unknown>) => { setMap(map: KakaoMap): void };
    Circle: new (options: Record<string, unknown>) => { setMap(map: KakaoMap | null): void };
    MapTypeId: Record<"ROADMAP" | "SKYVIEW" | "HYBRID" | "TRAFFIC" | "TERRAIN" | "BICYCLE" | "BICYCLE_HYBRID" | "USE_DISTRICT", unknown>;
    Roadview: new (node: HTMLElement) => { setPanoId(panoId: number, position: KakaoLatLng): void; relayout(): void };
    RoadviewClient: new () => { getNearestPanoId(position: KakaoLatLng, radius: number, callback: (panoId: number | null) => void): void };
    services?: {
      Places: new (map: KakaoMap) => {
        categorySearch(code: string, callback: (result: KakaoPlace[], status: string) => void, options: Record<string, unknown>): void;
        keywordSearch(keyword: string, callback: (result: KakaoPlace[], status: string) => void, options: Record<string, unknown>): void;
      };
      Status: { OK: string };
      SortBy: { DISTANCE: unknown };
    };
    drawing?: {
      OverlayType: Record<"POLYLINE" | "CIRCLE" | "POLYGON", unknown>;
      DrawingManager: new (options: Record<string, unknown>) => KakaoDrawingManager;
    };
    event?: { addListener(target: object, event: string, callback: (event: { latLng: KakaoLatLng }) => void): void };
  };
};

declare global {
  interface Window {
    kakao?: KakaoSdk;
  }
}

let kakaoSdkPromise: Promise<void> | null = null;

export function loadKakaoSdk(key: string) {
  if (window.kakao?.maps?.services) return Promise.resolve();
  if (kakaoSdkPromise) return kakaoSdkPromise;

  kakaoSdkPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (error) reject(error);
      else resolve();
    };
    const timeoutId = window.setTimeout(() => finish(new Error("Kakao SDK load timed out")), 12000);
    let existing = document.querySelector<HTMLScriptElement>('script[data-wave-kakao="true"]');
    if (existing && !window.kakao?.maps && (existing.dataset.loaded === "true" || existing.dataset.failed === "true")) {
      existing.remove();
      existing = null;
    }
    if (existing) {
      if (existing.dataset.loaded === "true") {
        finish(window.kakao?.maps ? undefined : new Error("Kakao SDK is unavailable for this domain"));
        return;
      }
      if (existing.dataset.failed === "true") {
        finish(new Error("Kakao SDK load failed"));
        return;
      }
      existing.addEventListener("load", () => finish(), { once: true });
      existing.addEventListener("error", () => finish(new Error("Kakao SDK load failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.waveKakao = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services,drawing`;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      finish();
    };
    script.onerror = () => {
      script.dataset.failed = "true";
      finish(new Error("Kakao SDK load failed"));
    };
    document.head.appendChild(script);
  });
  void kakaoSdkPromise.catch(() => {
    kakaoSdkPromise = null;
  });
  return kakaoSdkPromise;
}

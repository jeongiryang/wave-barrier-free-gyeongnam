import type { CSSProperties, RefObject } from "react";
import { safeMapImageUrl } from "../map-utils";
import type { CrowdSignal, MapPlace, MapProvider } from "../types";

interface CrowdVisual {
  level: string;
  label: string;
  message: string;
  color: string;
  soft: string;
}

interface RoadviewSelectionOverlaysProps {
  provider: MapProvider;
  roadviewSelectMode: boolean;
  roadviewPreviewOpen: boolean;
  roadviewOpen: boolean;
  selectedMapPlace: MapPlace | null;
  places: MapPlace[];
  onCancelRoadviewSelection: () => void;
}

interface MapCanvasStatusOverlaysProps {
  provider: MapProvider;
  roadviewOpen: boolean;
  roadviewMessage: string;
  roadviewRef: RefObject<HTMLDivElement | null>;
  crowd: CrowdSignal | null | undefined;
  crowdPlace: MapPlace | undefined;
  crowdVisual: CrowdVisual | null;
  onCloseRoadview: () => void;
}

export function RoadviewSelectionOverlays({ provider, roadviewSelectMode, roadviewPreviewOpen, roadviewOpen, selectedMapPlace, places, onCancelRoadviewSelection }: RoadviewSelectionOverlaysProps) {
  const previewImage = safeMapImageUrl(selectedMapPlace?.image || places[0]?.image);
  return <>
    {roadviewSelectMode && <div className="roadview-pick-banner" role="status"><div><strong>로드뷰 위치 선택</strong><span>지도에서 확인할 도로나 장소를 클릭하세요.</span></div><button type="button" onClick={onCancelRoadviewSelection} aria-label="로드뷰 위치 선택 취소">×</button></div>}
    {roadviewPreviewOpen && !roadviewSelectMode && !roadviewOpen && provider === "kakao" && <aside className="roadview-hover-preview" aria-label="로드뷰 위치 선택 미리보기">
      {previewImage && <div style={{ backgroundImage: `url("${previewImage.replace(/["\\]/g, "")}")` }} />}
      <small>관광사진 미리보기</small><strong>{selectedMapPlace?.name || places[0]?.name || "지도에서 위치 선택"}</strong><span>버튼을 누른 뒤 지도에서 로드뷰 위치를 선택합니다.</span>
    </aside>}
  </>;
}

export function MapCanvasStatusOverlays({ provider, roadviewOpen, roadviewMessage, roadviewRef, crowd, crowdPlace, crowdVisual, onCloseRoadview }: MapCanvasStatusOverlaysProps) {
  return <>
    {crowdVisual && crowd && crowdPlace && !roadviewOpen && <aside className={`map-crowd-legend crowd-${crowdVisual.level}`} style={{ "--crowd-color": crowdVisual.color, "--crowd-soft": crowdVisual.soft } as CSSProperties} aria-label={`${crowdPlace.name} 혼잡 예측 ${crowdVisual.label}`}>
      <span className="crowd-visual"><i /></span>
      <div><small>30일 혼잡 예측 · {crowdPlace.name}</small><strong>{crowdVisual.label}</strong><p>{crowdVisual.message}</p></div>
      <em>{crowd.rate.toFixed(1)}%</em>
    </aside>}
    {provider === "loading" && <div className="map-loading-skeleton" role="status" aria-label="지도 연결 중"><div><i /><i /><i /><span /></div><p><b />카카오 지도를 안전하게 연결하고 있습니다.</p></div>}
    {roadviewOpen && <section className="map-roadview-panel" aria-label="카카오 로드뷰">
      <header><strong>로드뷰</strong><button type="button" onClick={onCloseRoadview} aria-label="로드뷰 닫기">×</button></header>
      <div ref={roadviewRef} />
      {roadviewMessage && <p>{roadviewMessage}</p>}
    </section>}
  </>;
}

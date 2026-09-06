import { useSitePreferences } from "../../../components/SitePreferences";

interface MapExportPanelProps {
  onClose: () => void;
  onExport: (format: "png" | "jpeg") => void;
  onShare: () => void;
  actionNotice: string;
  actionPending: boolean;
}

export default function MapExportPanel({ onClose, onExport, onShare, actionNotice, actionPending }: MapExportPanelProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section id="map-panel-export" className="map-tool-panel map-side-drawer map-export-panel" aria-label={en ? "Journey image" : "지도 이미지 저장"} tabIndex={-1}>
    <header><div><strong>{en ? "Journey image" : "지도 이미지 저장"}</strong><span>{en ? "An overview of places and your selected journey" : "여행 장소와 선택한 이동 구간 안내도"}</span></div><button type="button" onClick={onClose} aria-label={en ? "Close journey image" : "이미지 저장 닫기"}>×</button></header>
    <div className="map-export-preview"><span>W.A.V.E</span><strong>{en ? "Journey schematic" : "여행 장소 안내도"}</strong><small>1600 × 1000px</small></div>
    <p>{en ? "Map tiles are excluded. Connecting lines may differ from actual routes and do not guarantee accessible travel. Place names use the original data." : "지도 배경은 포함하지 않습니다. 장소를 잇는 선은 실제 경로와 다를 수 있으며 무장애 이동을 보장하지 않습니다."}</p>
    <div className="map-export-actions">
      <button type="button" aria-disabled={actionPending} onClick={() => onExport("png")}><i>PNG</i>{en ? "Download PNG image" : "PNG 이미지 다운로드"}</button>
      <button type="button" aria-disabled={actionPending} onClick={() => onExport("jpeg")}><i>JPG</i>{en ? "Download JPG image" : "JPG 이미지 다운로드"}</button>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true">{actionNotice}</p>
    <button type="button" className="map-share-wide" aria-disabled={actionPending} onClick={onShare}>{en ? "Share page link ↗" : "페이지 링크 공유하기 ↗"}</button>
    <p>{en ? "This page link does not include your saved itinerary. Use itinerary sharing for the whole trip." : "페이지 링크에는 저장한 일정이 포함되지 않습니다. 전체 여행은 내 일정의 공유 기능을 이용하세요."}</p>
  </section>;
}

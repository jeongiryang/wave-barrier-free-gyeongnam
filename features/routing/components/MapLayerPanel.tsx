import { overlayLayers } from "../constants";
import { useSitePreferences } from "../../../components/SitePreferences";

const englishLayers = { TRAFFIC: "Traffic", BICYCLE: "Bicycle", TERRAIN: "Terrain", USE_DISTRICT: "Cadastral map" };

interface MapLayerPanelProps {
  available: boolean;
  loading: boolean;
  onRetry: () => void;
  activeLayers: string[];
  onClose: () => void;
  onToggleLayer: (id: (typeof overlayLayers)[number]["id"]) => void;
  onSave: () => void;
  onShare: () => void;
}

export default function MapLayerPanel({ available, loading, onRetry, activeLayers, onClose, onToggleLayer, onSave, onShare }: MapLayerPanelProps) {
  const { locale } = useSitePreferences(); const english = locale === "en";
  return <section id="map-panel-layers" className="map-tool-panel map-side-drawer map-layer-panel" role="region" aria-label={english ? "Map display settings" : "지도 표시 설정"} tabIndex={-1} onFocusCapture={(event) => {
    if (event.target !== event.currentTarget && event.target.matches(":focus-visible")) event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }}>
    <header><div><strong>{english ? "Map settings" : "지도 설정"}</strong><span>{english ? "Kakao map layers" : "카카오 공식 지도 레이어"}</span></div><button type="button" onClick={onClose} aria-label={english ? "Close map settings" : "지도 설정 닫기"}>×</button></header>
    <h4>{english ? "Layers" : "레이어"}</h4>
    {!available && <p role="status">{english ? "Reconnect the main map to use these layers. Your choices are saved for reconnection." : "기본 지도에 다시 연결하면 표시 설정을 사용할 수 있습니다. 재연결할 때 선택한 설정을 다시 적용합니다."}</p>}
    <div className="map-tool-grid">{overlayLayers.map((layer) => <button type="button" key={layer.id} aria-disabled={!available} aria-pressed={activeLayers.includes(layer.id)} className={activeLayers.includes(layer.id) ? "active" : ""} onClick={() => { if (available) onToggleLayer(layer.id); }}><i aria-hidden="true">{layer.icon}</i>{english ? englishLayers[layer.id] : layer.label}</button>)}</div>
    <h4>{english ? "Journey tools" : "경로 도구"}</h4>
    <div className="map-utility-actions">
      <button type="button" onClick={onSave}><i aria-hidden="true">＋</i>{english ? "Add to itinerary" : "내 일정에 추가"}</button>
      <button type="button" onClick={() => window.print()}><i aria-hidden="true">▣</i>{english ? "Print" : "인쇄"}</button>
      <button type="button" onClick={onShare}><i aria-hidden="true">↗</i>{english ? "Page link" : "페이지 링크"}</button>
      <button type="button" aria-disabled={loading} onClick={() => { if (!loading) onRetry(); }}><i aria-hidden="true">↻</i>{english ? "Reload map" : "지도 다시 불러오기"}</button>
    </div>
  </section>;
}

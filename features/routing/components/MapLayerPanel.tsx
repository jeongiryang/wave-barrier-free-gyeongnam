import { overlayLayers } from "../constants";

interface MapLayerPanelProps {
  activeLayers: string[];
  onClose: () => void;
  onToggleLayer: (id: (typeof overlayLayers)[number]["id"]) => void;
  onSave: () => void;
  onShare: () => void;
}

export default function MapLayerPanel({ activeLayers, onClose, onToggleLayer, onSave, onShare }: MapLayerPanelProps) {
  return <section id="map-panel-layers" className="map-tool-panel map-side-drawer map-layer-panel" role="region" aria-label="지도 표시 설정" tabIndex={-1}>
    <header><div><strong>지도 설정</strong><span>카카오 공식 지도 레이어</span></div><button type="button" onClick={onClose} aria-label="지도 설정 닫기">×</button></header>
    <h4>레이어</h4>
    <div className="map-tool-grid">{overlayLayers.map((layer) => <button type="button" key={layer.id} aria-pressed={activeLayers.includes(layer.id)} className={activeLayers.includes(layer.id) ? "active" : ""} onClick={() => onToggleLayer(layer.id)}><i aria-hidden="true">{layer.icon}</i>{layer.label}</button>)}</div>
    <h4>경로 도구</h4>
    <div className="map-utility-actions">
      <button type="button" onClick={onSave}><i aria-hidden="true">＋</i>이 기기 일정에 추가</button>
      <button type="button" onClick={() => window.print()}><i aria-hidden="true">▣</i>인쇄</button>
      <button type="button" onClick={onShare}><i aria-hidden="true">↗</i>공유</button>
    </div>
  </section>;
}

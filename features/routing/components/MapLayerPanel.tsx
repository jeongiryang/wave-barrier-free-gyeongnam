import { overlayLayers } from "../constants";
import type { MeasurementMode } from "../types";

interface MapLayerPanelProps {
  activeLayers: string[];
  measureMode: MeasurementMode | null;
  measureSummary: string;
  onClose: () => void;
  onToggleLayer: (id: (typeof overlayLayers)[number]["id"]) => void;
  onSelectMeasure: (mode: MeasurementMode) => void;
  onClearMeasurements: () => void;
  onSave: () => void;
  onShare: () => void;
}

export default function MapLayerPanel({ activeLayers, measureMode, measureSummary, onClose, onToggleLayer, onSelectMeasure, onClearMeasurements, onSave, onShare }: MapLayerPanelProps) {
  const measurementAvailable = typeof window !== "undefined" && Boolean(window.kakao?.maps.drawing);
  return <section className="map-tool-panel map-side-drawer map-layer-panel" aria-label="지도 레이어와 측정 도구">
    <header><div><strong>지도 설정</strong><span>카카오 공식 지도 레이어</span></div><button type="button" onClick={onClose} aria-label="지도 설정 닫기">×</button></header>
    <h4>레이어</h4>
    <div className="map-tool-grid">{overlayLayers.map((layer) => <button type="button" key={layer.id} className={activeLayers.includes(layer.id) ? "active" : ""} onClick={() => onToggleLayer(layer.id)}><i>{layer.icon}</i>{layer.label}</button>)}</div>
    <h4>측정</h4>
    {!measurementAvailable && <p className="map-measure-summary">안전한 브라우저 정책을 위해 지도 측정 도구는 현재 제공하지 않습니다.</p>}
    <div className="map-tool-grid">
      <button type="button" disabled={!measurementAvailable} className={measureMode === "POLYLINE" ? "active" : ""} onClick={() => onSelectMeasure("POLYLINE")}><i>╱</i>거리</button>
      <button type="button" disabled={!measurementAvailable} className={measureMode === "CIRCLE" ? "active" : ""} onClick={() => onSelectMeasure("CIRCLE")}><i>○</i>반경</button>
      <button type="button" disabled={!measurementAvailable} className={measureMode === "POLYGON" ? "active" : ""} onClick={() => onSelectMeasure("POLYGON")}><i>△</i>면적</button>
      <button type="button" disabled={!measurementAvailable} onClick={onClearMeasurements}><i>×</i>지우기</button>
    </div>
    {measureSummary && <p className="map-measure-summary">{measureSummary}</p>}
    <h4>경로 도구</h4>
    <div className="map-utility-actions">
      <button type="button" onClick={onSave}><i>＋</i>이 기기 일정에 추가</button>
      <button type="button" onClick={() => window.print()}><i>▣</i>인쇄</button>
      <button type="button" onClick={onShare}><i>↗</i>공유</button>
    </div>
  </section>;
}

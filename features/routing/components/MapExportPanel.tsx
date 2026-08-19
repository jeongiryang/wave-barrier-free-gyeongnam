interface MapExportPanelProps {
  onClose: () => void;
  onExport: (format: "png" | "jpeg") => void;
  onShare: () => void;
}

export default function MapExportPanel({ onClose, onExport, onShare }: MapExportPanelProps) {
  return <section className="map-tool-panel map-side-drawer map-export-panel" aria-label="지도 이미지 저장">
    <header><div><strong>지도 이미지 저장</strong><span>경로·장소·시간을 담은 고해상도 이미지</span></div><button type="button" onClick={onClose} aria-label="이미지 저장 닫기">×</button></header>
    <div className="map-export-preview"><span>W.A.V.E</span><strong>여행 경로 지도</strong><small>1600 × 1000px</small></div>
    <p>브라우저 보안과 지도 저작권을 지키기 위해 카카오 배경 타일은 제외하고, 현재 경로와 장소를 읽기 쉬운 공유용 지도 이미지로 만듭니다.</p>
    <div className="map-export-actions">
      <button type="button" onClick={() => onExport("png")}><i>PNG</i>투명도 없는 선명한 이미지</button>
      <button type="button" onClick={() => onExport("jpeg")}><i>JPG</i>용량이 작은 공유용 이미지</button>
    </div>
    <button type="button" className="map-share-wide" onClick={onShare}>현재 경로 공유하기 ↗</button>
  </section>;
}

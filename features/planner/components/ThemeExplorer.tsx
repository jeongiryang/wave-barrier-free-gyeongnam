import SmartSpotImage from "../../../components/SmartSpotImage";
import { richCatalog } from "../constants";
import type { RichMode, RichSpot } from "../types";

interface ThemeExplorerProps {
  region: string;
  loading: boolean;
  richMode: RichMode;
  onRichModeChange: (mode: RichMode) => void;
  richItems: RichSpot[];
  onReload: () => void;
  onRouteFromSpot: (spot: RichSpot) => void;
}

export default function ThemeExplorer({
  region,
  loading,
  richMode,
  onRichModeChange,
  richItems,
  onReload,
  onRouteFromSpot,
}: ThemeExplorerProps) {
  return <div className="theme-explorer" data-reveal>
    <div className="layer-tabs" role="tablist" aria-label="여행 테마 데이터 선택">
      {richCatalog.map((item) => <button key={item.id} type="button" role="tab" aria-selected={richMode === item.id} className={richMode === item.id ? "active" : ""} onClick={() => onRichModeChange(item.id)}>
        <span>{item.icon}</span><b>{item.label}</b><small>{item.description}</small>
      </button>)}
    </div>
    <div className="rich-rail" role="tabpanel">
      {loading && [0, 1, 2].map((item) => <div className="rich-card rich-loading" key={item}><i /><span /><b /></div>)}
      {!loading && !richItems.length && <div className="rich-empty">
        <span>⌁</span>
        <h3>{region}의 {richCatalog.find((item) => item.id === richMode)?.label} 결과를 찾는 중입니다.</h3>
        <p>공공데이터의 지역별 제공 범위에 따라 결과가 없을 수 있습니다.</p>
        <button type="button" onClick={onReload}>다시 조회</button>
      </div>}
      {!loading && richItems.map((spot, index) => <article className="rich-card" key={`${spot.id}-${index}`}>
        <SmartSpotImage src={spot.image} title={spot.title} region={region} tag={spot.tag} rank={index + 1} contentId={spot.id} />
        <section>
          <small>{spot.source}</small><h3>{spot.title}</h3>
          <p>{spot.address || spot.summary || `${region}에서 만나는 ${spot.tag} 여행 정보`}</p>
          <button type="button" disabled={!spot.mapX || !spot.mapY} onClick={() => onRouteFromSpot(spot)}>{spot.mapX && spot.mapY ? "지도에서 경로 보기" : "위치 정보 확인 중"}<span>↗</span></button>
        </section>
      </article>)}
    </div>
  </div>;
}

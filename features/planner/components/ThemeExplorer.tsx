import { useMemo } from "react";
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import { richCatalog } from "../constants";
import { useTabListKeyboard } from "../hooks/useTabListKeyboard";
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
  const modeIds = useMemo(() => richCatalog.map((item) => item.id as RichMode), []);
  const { listRef, onKeyDown, tabProps } = useTabListKeyboard(modeIds, richMode, onRichModeChange);
  return <div className="theme-explorer" data-reveal>
    {(richMode === "awards" || richMode === "rests") && <p className="condition-scope">조회된 자료 중 경남에 위치한 항목만 표시합니다. 선택한 시·군 밖의 경남 자료가 포함될 수 있으며, 도착 전 주소를 확인해 주세요.</p>}
    <div className="layer-tabs" role="tablist" aria-label="여행 테마 데이터 선택" ref={listRef} onKeyDown={onKeyDown}>
      {richCatalog.map((item) => <button key={item.id} type="button" {...tabProps(item.id as RichMode)} id={`theme-tab-${item.id}`} aria-controls="theme-panel" className={richMode === item.id ? "active" : ""} onClick={() => onRichModeChange(item.id)}>
        <span>{item.icon}</span><b>{item.label}</b><small>{item.description}</small>
      </button>)}
    </div>
    <div className="rich-rail" role="tabpanel" id="theme-panel" aria-labelledby={`theme-tab-${richMode}`} tabIndex={-1}>
      {loading && [0, 1, 2].map((item) => <div className="rich-card rich-loading" key={item}><i /><span /><b /></div>)}
      {!loading && !richItems.length && <div className="rich-empty">
        <span>⌁</span>
        <h3>현재 조건에 맞는 {richCatalog.find((item) => item.id === richMode)?.label} 자료가 없습니다.</h3>
        <p>공공데이터의 지역별 제공 범위에 따라 결과가 없을 수 있습니다.</p>
        <button type="button" onClick={onReload}>다시 조회</button>
      </div>}
      {!loading && richItems.map((spot, index) => <article className="rich-card" key={`${spot.id}-${index}`}>
        <SmartSpotImage src={spot.image} title={spot.title} region={region} tag={spot.tag} rank={index + 1} contentId={spot.id} />
        <section>
          <small>{spot.source}</small><h3>{spot.title}</h3>
          <p>{spot.address || spot.summary || `${region}에서 만나는 ${spot.tag} 여행 정보`}</p>
          <button type="button" disabled={!spot.mapX || !spot.mapY} onClick={() => onRouteFromSpot(spot)}>{spot.mapX && spot.mapY ? "지도에서 경로 보기" : "좌표 정보 미제공"}<span>↗</span></button>
        </section>
      </article>)}
    </div>
  </div>;
}

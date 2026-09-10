import { useMemo } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import { richCatalog } from "../constants";
import { useTabListKeyboard } from "../hooks/useTabListKeyboard";
import type { RichMode, RichSpot } from "../types";
import { themeExplorerEnglish } from "../theme-explorer-copy";
import { regionNames } from "../../../lib/gyeongnam-region-names";

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
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const regionLabel = english ? regionNames[region] || region : region;
  const catalog = richCatalog.map(item => english ? { ...item, ...themeExplorerEnglish[item.id] } : item);
  const modeIds = useMemo(() => richCatalog.map((item) => item.id as RichMode), []);
  const { listRef, onKeyDown, tabProps } = useTabListKeyboard(modeIds, richMode, onRichModeChange);
  return <div className="theme-explorer" data-reveal>
    {(richMode === "awards" || richMode === "rests") && <p className="condition-scope">{english ? "These records are located in Gyeongnam and may be outside your selected city or county. Check the address before visiting." : "조회된 자료 중 경남에 위치한 항목만 표시합니다. 선택한 시·군 밖의 경남 자료가 포함될 수 있으며, 도착 전 주소를 확인해 주세요."}</p>}
    {richMode === "language" && <p className="condition-scope">{english ? `Tourism information for ${regionLabel} in your selected language. This regional list is separate from the places in your itinerary and does not confirm on-site interpretation or guide services.` : `선택한 언어로 제공되는 ${region} 관광정보입니다. 내 일정의 장소와 별도로 조회한 지역 목록이며, 현장 통역이나 안내 인력의 제공 여부를 뜻하지 않습니다.`}</p>}
    <div className="layer-tabs" role="tablist" aria-label={english ? "Choose regional travel information" : "여행 테마 데이터 선택"} ref={listRef} onKeyDown={onKeyDown}>
      {catalog.map((item) => <button key={item.id} type="button" {...tabProps(item.id as RichMode)} id={`theme-tab-${item.id}`} aria-controls="theme-panel" className={richMode === item.id ? "active" : ""} onClick={() => onRichModeChange(item.id)}>
        <span>{item.icon}</span><b>{item.label}</b><small>{item.description}</small>
      </button>)}
    </div>
    <div className="rich-rail" role="tabpanel" id="theme-panel" aria-labelledby={`theme-tab-${richMode}`} tabIndex={-1}>
      {loading && [0, 1, 2].map((item) => <div className="rich-card rich-loading" key={item}><i /><span /><b /></div>)}
      {!loading && !richItems.length && <div className="rich-empty">
        <span>⌁</span>
        <h3>{english ? `No ${catalog.find(item => item.id === richMode)?.label.toLowerCase()} records match your current preferences.` : `현재 조건에 맞는 ${catalog.find(item => item.id === richMode)?.label} 자료가 없습니다.`}</h3>
        <p>{english ? "Public information coverage varies by region." : "공공데이터의 지역별 제공 범위에 따라 결과가 없을 수 있습니다."}</p>
        <button type="button" onClick={onReload}>{english ? "Search again" : "다시 조회"}</button>
      </div>}
      {!loading && richItems.map((spot, index) => <article className="rich-card" key={`${spot.id}-${index}`}>
        <SmartSpotImage src={spot.image} title={spot.title} region={region} tag={spot.tag} rank={index + 1} contentId={spot.id} showMeta={false} />
        <section>
          <small>{spot.source}</small><h3>{spot.title}</h3>
          <p>{spot.address || spot.summary || (english ? `${spot.tag} travel information in ${regionLabel}` : `${region}에서 만나는 ${spot.tag} 여행 정보`)}</p>
          <button type="button" disabled={!spot.mapX || !spot.mapY} onClick={() => onRouteFromSpot(spot)}>{spot.mapX && spot.mapY ? (english ? "View route on the map" : "지도에서 경로 보기") : (english ? "Coordinates unavailable" : "좌표 정보 미제공")}<span>↗</span></button>
        </section>
      </article>)}
    </div>
  </div>;
}

import type { CSSProperties } from "react";
import Link from "next/link";
import { landingRegions, type LandingRegion, type LandingTranslate, type RegionPhoto } from "../content";

interface LandingRegionStoryProps {
  t: LandingTranslate;
  activeRegion: string;
  active: LandingRegion;
  preview: LandingRegion | null;
  regionPhotos: Record<string, RegionPhoto | null | undefined>;
  showRegionPreview: (region: string, immediate?: boolean) => void;
  hideRegionPreview: (region: string) => void;
  selectRegion: (region: string) => void;
}

function RegionMapSurface() {
  return <svg className="region-map-surface" viewBox="0 0 600 433" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="region-land" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity=".3" />
        <stop offset="1" stopColor="currentColor" stopOpacity=".09" />
      </linearGradient>
    </defs>
    <path className="region-map-land" d="M46 99C76 58 136 50 184 58c38 6 62-30 105-21 31 7 46 37 79 36 36-1 71-20 105 0 24 14 28 49 60 56 30 7 47 34 35 63-12 28-56 29-67 56-9 22 12 49-7 66-23 21-57 0-80 21-17 15-16 52-43 59-28 7-49-28-76-21-28 7-36 49-67 52-28 3-39-28-66-30-26-1-51 29-75 12-25-18 1-53-16-78-14-22-55-13-65-41-10-29 25-53 17-83-8-30-40-51-23-79Z" />
    <path className="region-map-coast" d="M47 99c43 10 59 40 93 50 47 14 92-18 132 9 34 23 51 66 91 70 48 5 83-36 133-31 29 3 50 19 72 35" />
    <path className="region-map-river" d="M188 58c-7 52 39 70 31 112-7 35-52 54-42 94 8 34 52 50 47 101M368 73c-23 35-8 66 12 93 22 30 17 69-11 93-22 18-32 49-22 79" />
    <path className="region-map-boundaries" d="M98 72l35 77-41 81m91-171 36 111 72-133m-72 133 54 78-49 117m49-117 90-20 61-113m-61 113 6 31 78 16m-78-16-22 83m100-67 69-78M116 279l61-15 47 101m-47-101-70 83m262-88 65 76" />
    <g className="region-map-islands">
      <path d="M315 388c13-12 33-7 33 8-1 15-24 19-34 9-5-5-4-12 1-17Z" />
      <path d="M384 371c10-8 25-3 24 8-1 12-17 16-27 9-7-5-4-12 3-17Z" />
      <path d="M151 373c9-6 21-1 20 9-2 9-16 12-23 6-5-5-3-11 3-15Z" />
    </g>
  </svg>;
}

export default function LandingRegionStory({ t, activeRegion, active, preview, regionPhotos, showRegionPreview, hideRegionPreview, selectRegion }: LandingRegionStoryProps) {
  const previewPhoto = preview ? regionPhotos[preview.name] : null;
  const activePhoto = regionPhotos[active.name]?.image;

  return <section className="region-story" id="regions">
    <div className="region-story-copy" data-land-reveal>
      <p className="section-kicker">경남 18개 시·군</p>
      <h2>{t("regionTitle", "내 조건에 맞는 지역부터 골라보세요.")}</h2>
      <p>{t("regionCopy", "지역 이름을 누르면 대표 이야기를 살펴보고, 선택한 지역으로 바로 여행 설계를 시작할 수 있습니다.")}</p>
      <div className="selected-region" role="status" aria-live="polite" aria-atomic="true">
        {activePhoto
          ? <span className="selected-region-photo" style={{ backgroundImage: `url("${activePhoto}")` }} aria-hidden="true" />
          : <span className="selected-region-mark" aria-hidden="true"><i /><b>{active.name.slice(0, 1)}</b></span>}
        <div><small>{t("selected", "지금 선택한 지역")}</small><strong>{active.name}</strong><p>{active.story}</p></div>
      </div>
      <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{active.name} {t("makeTrip", "여행 만들기")} <b>→</b></Link>
    </div>
    <div className="landing-region-map" data-land-reveal aria-label="지역 위치를 단순화한 경상남도 18개 시·군 선택 안내도">
      <div className="region-map-heading" aria-hidden="true"><span>경남 지역 안내도</span><b>18개 시·군</b><i /></div>
      <div className="landing-region-map-scroll">
        <div className="landing-region-map-canvas" data-region-map-canvas role="group" aria-label="지도 위 지역 표식">
          <RegionMapSurface />
          {landingRegions.map((region, index) => <button
            key={region.name}
            type="button"
            className={activeRegion === region.name ? "active" : ""}
            style={{ left: `${region.x}%`, top: `${region.y}%`, "--region-index": index } as CSSProperties}
            data-region-marker={region.name}
            data-region-x={region.x}
            data-region-y={region.y}
            onClick={() => selectRegion(region.name)}
            onPointerEnter={() => showRegionPreview(region.name)}
            onPointerLeave={() => hideRegionPreview(region.name)}
            onFocus={() => showRegionPreview(region.name, true)}
            onBlur={() => hideRegionPreview(region.name)}
            aria-label={`${region.name}: ${region.story}`}
            aria-pressed={activeRegion === region.name}
          ><span className="region-marker-dot" aria-hidden="true"><i /></span><b>{region.name}</b></button>)}
          {preview && <div className={`region-photo-preview${previewPhoto === undefined ? " loading" : ""}`} style={{ left: `${preview.x}%`, top: `${preview.y}%` }}>
            {previewPhoto?.image
              ? <div style={{ backgroundImage: `linear-gradient(180deg,transparent 32%,rgba(3,24,41,.78)),url("${previewPhoto.image}")` }} />
              : previewPhoto === undefined
                ? <div className="region-photo-skeleton"><i /><i /></div>
                : <div className="region-photo-placeholder"><span className="region-photo-placeholder-mark" aria-hidden="true"><i /><b>{preview.name.slice(0, 1)}</b></span><small>지역 이야기</small><strong>{preview.name}</strong></div>}
            <section className={previewPhoto === undefined ? "loading-copy" : ""}><small>{previewPhoto?.location || "경상남도 관광사진"}</small><strong>{previewPhoto?.title || `${preview.name}의 여행 이야기`}</strong><span>{previewPhoto === undefined ? "공식 관광사진 불러오는 중" : preview.story}</span></section>
          </div>}
        </div>
      </div>

      <p className="region-map-note">지역 위치를 알아보기 쉽게 단순화한 안내도입니다.</p>
    </div>
  </section>;
}

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { RegionMascot } from "../../../components/RegionMascot";
import { landingRegions, type LandingRegion, type LandingTranslate, type RegionPhoto } from "../content";

interface LandingRegionStoryProps {
  t: LandingTranslate;
  activeRegion: string;
  active: LandingRegion;
  preview: LandingRegion | null;
  regionPhotos: Record<string, RegionPhoto | null | undefined>;
  setPreviewRegion: Dispatch<SetStateAction<string | null>>;
  loadRegionPhoto: (region: string) => Promise<void>;
  selectRegion: (region: string) => void;
}

export default function LandingRegionStory({ t, activeRegion, active, preview, regionPhotos, setPreviewRegion, loadRegionPhoto, selectRegion }: LandingRegionStoryProps) {
  const previewPhoto = preview ? regionPhotos[preview.name] : null;
  return <section className="region-story" id="regions">
    <div className="region-story-copy" data-land-reveal>
      <p className="section-kicker">18 CITIES · 18 STORIES</p>
      <h2>{t("regionTitle", "경남의 경계 안에 열여덟 개의 이야기가 있습니다.")}</h2>
      <p>{t("regionCopy", "지역 표식을 눌러 대표 이야기를 살펴보고, 선택한 지역으로 바로 여행 설계를 시작하세요.")}</p>
      <div className="selected-region">{regionPhotos[active.name]?.image ? <span className="selected-region-photo" style={{ backgroundImage: `url("${regionPhotos[active.name]!.image}")` }} aria-hidden="true" /> : <span className="selected-region-mascot"><RegionMascot region={active.name} size={54} /></span>}<div><small>{t("selected", "지금 선택한 지역")}</small><strong>{active.name}</strong><p>{active.story}</p></div></div>
      <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{active.name} {t("makeTrip", "여행 만들기")} <b>→</b></Link>
    </div>
    <div className="landing-region-map" data-land-reveal aria-label="경상남도 18개 시·군 선택 지도">
      <div className="landing-region-map-canvas" data-region-map-canvas>
        {/* Public-domain administrative map from Wikimedia Commons, nominally 600 × 433. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/Map_Gyeosangnam-do.svg" alt="경상남도 시군 경계 지도" width="600" height="433" />
        {landingRegions.map((region, index) => <button
          key={region.name}
          type="button"
          className={activeRegion === region.name ? "active" : ""}
          style={{ left: `${region.x}%`, top: `${region.y}%`, "--region-index": index } as CSSProperties}
          data-region-marker={region.name}
          data-region-x={region.x}
          data-region-y={region.y}
          onClick={() => selectRegion(region.name)}
          onPointerEnter={() => { setPreviewRegion(region.name); void loadRegionPhoto(region.name); }}
          onPointerLeave={() => setPreviewRegion(null)}
          onFocus={() => { setPreviewRegion(region.name); void loadRegionPhoto(region.name); }}
          onBlur={() => setPreviewRegion(null)}
          aria-label={`${region.name}: ${region.story}`}
        ><span><RegionMascot region={region.name} size={25} /></span><b>{region.name}</b></button>)}
        {preview && <div className={`region-photo-preview${previewPhoto === undefined ? " loading" : ""}`} style={{ left: `${preview.x}%`, top: `${preview.y}%` }} aria-live="polite">
          {previewPhoto?.image ? <div style={{ backgroundImage: `linear-gradient(180deg,transparent 32%,rgba(3,24,41,.78)),url("${previewPhoto.image}")` }} /> : previewPhoto === undefined ? <div className="region-photo-skeleton"><i /><i /></div> : <div className="region-photo-placeholder"><RegionMascot region={preview.name} size={58} /><small>W.A.V.E REGION MATE</small><strong>{preview.name}</strong></div>}
          <section className={previewPhoto === undefined ? "loading-copy" : ""}><small>{previewPhoto?.location || "경상남도 관광사진"}</small><strong>{previewPhoto?.title || `${preview.name}의 여행 이야기`}</strong><span>{previewPhoto === undefined ? "공식 관광사진 불러오는 중" : preview.story}</span></section>
        </div>}
      </div>
    </div>
  </section>;
}

import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingHeroCopy from "./LandingHeroCopy";
import EditorialPhoto from "./EditorialPhoto";
import { horizonPhotos } from "../horizon-photos";
import type { LandingTranslate } from "../content";

export default function LandingHero({ t }: { t: LandingTranslate }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero landing-hero-split" id="top" tabIndex={-1} aria-labelledby="landing-title">
    <div className="landing-hero-copy">
      <LandingHeroCopy />
      <p className="landing-hero-description">{t("heroEvidenceDescription", "공식 관광정보를 확인됨·불일치·미확인으로 구분하고 선택한 조건을 임의로 풀지 않은 일정과 대안을 제안해요")}</p>
      <ul className="landing-hero-promises" aria-label={en ? "W.A.V.E promises" : "W.A.V.E가 지키는 원칙"}>
        <li>{en ? "Requirements stay locked" : "필수 편의 유지"}</li>
        <li>{en ? "Unknowns stay visible" : "미확인 정보 공개"}</li>
        <li>{en ? "You approve every change" : "변경 전 직접 확인"}</li>
      </ul>
      <div className="landing-actions"><Link href="/planner">{en ? "Explore places" : "여행지 둘러보기"}<span aria-hidden="true">→</span></Link></div>
    </div>
    <EditorialPhoto photo={horizonPhotos.coast} className="landing-hero-landscape" priority />
  </section>;
}

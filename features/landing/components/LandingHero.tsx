import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import WaveField from "../../../components/WaveField";
import type { LandingTranslate } from "../content";

export default function LandingHero({ t, replay = 0 }: { t: LandingTranslate; replay?: number }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero" id="top" data-intro-replay={replay}>
    <WaveField replay={replay} className="hero-wave-canvas" tone="light" mode="intro" />
    <div className="landing-hero-copy" data-land-reveal>
      <p><span className="access-badge">{t("heroBadge", "경남 무장애 여행")}</span></p>
      <h1>{t("heroTitle", "필요한 편의부터 고르고,")}<br /><em>{t("heroEm", "나에게 맞는 경남 여행을 찾아보세요.")}</em></h1>
      <span>{t("heroCopy", "확인된 편의시설을 보고 여행지를 고른 뒤 일정과 이동 경로까지 한곳에서 정리할 수 있어요.")}</span>
      <div className="landing-actions"><Link href="/planner">{en ? "Plan my trip" : "여행 계획 만들기"} <b aria-hidden="true">→</b></Link></div>
    </div>
    <div className="landing-signal landing-journey-summary" role="img" aria-label={en ? "Four steps: choose a region and facilities, find places, then check your itinerary and travel routes." : "지역과 필요한 편의를 고르고 여행지를 일정에 추가해 이동 경로를 확인하는 네 단계"} data-land-reveal>
      <ol aria-hidden="true">
        <li><b>1</b><span>{en ? "Choose a region" : "지역 선택"}</span></li>
        <li><b>2</b><span>{en ? "Required facilities" : "필요한 편의"}</span></li>
        <li><b>3</b><span>{en ? "Find places" : "여행지 찾기"}</span></li>
        <li><b>4</b><span>{en ? "Itinerary and routes" : "일정·이동 확인"}</span></li>
      </ol>
      <p>{en ? "Check the source and latest update before you leave." : "확인된 정보와 다시 확인할 내용을 구분해 보여드려요."}</p>
    </div>
  </section>;
}

import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import WaveField from "../../../components/WaveField";
import StoryMedia from "./StoryMedia";
import type { LandingTranslate } from "../content";

export default function LandingHero({ t, replay = 0 }: { t: LandingTranslate; replay?: number }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <section className="landing-hero" id="top" data-intro-replay={replay}>
    <StoryMedia>
    <div className="hero-opening">
    <div className="landing-hero-copy">
      <p><span className="access-badge">{t("heroBadge", "경남 무장애 여행")}</span></p>
      <h1 id="landing-title" tabIndex={-1}>{t("heroTitle", "필요한 편의부터,")}<br /><em>{t("heroEm", "내게 맞는 경남 여행.")}</em></h1>
      <span>{t("heroCopy", "내게 필요한 편의로 경남 여행지를 찾고, 일정과 이동을 준비하세요. 로그인 없이 시작할 수 있어요.")}</span>
      <div className="landing-actions"><Link href="/planner">{en ? "Plan my trip" : "여행 계획 만들기"} <b aria-hidden="true">→</b></Link></div>
    </div>
    <div className="hero-arrival" aria-label={en ? "From the facilities you need to a journey you choose" : "필요한 편의에서 내가 고른 여행으로"}>
      <WaveField replay={replay} className="hero-wave-canvas" tone="deep" mode="intro" />
      <div className="hero-arrival-still" aria-hidden="true"><strong>W.A.V.E</strong><span>{en ? "Your way to Gyeongnam" : "누구나, 경남을 향해"}</span></div>
      <p>{en ? "Facilities → places → a day of your own" : "필요한 편의 → 가고 싶은 장소 → 나만의 하루"}</p>
    </div>
    </div>
    </StoryMedia>
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

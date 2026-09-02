import Link from "next/link";
import AccessIcon from "../../../components/AccessIcons";
import WaveField from "../../../components/WaveField";
import type { LandingTranslate } from "../content";

export default function LandingHero({ t }: { t: LandingTranslate }) {
  return <section className="landing-hero" id="top">
    <WaveField className="hero-wave-canvas" tone="light" mode="ambient" />
    <div className="landing-hero-copy" data-land-reveal>
      <p><span className="access-badge"><AccessIcon name="mark" size={18} />{t("heroBadge", "경남 무장애 여행 설계")}</span></p>
      <h1>{t("heroTitle", "내 조건에서 시작해,")}<br /><em>{t("heroEm", "갈 수 있는 하루를 설계합니다.")}</em></h1>
      <span>{t("heroCopy", "필요한 편의조건을 먼저 고르면 공식 근거가 있는 장소, 하루 일정, 이동과 날씨 대응까지 한 흐름으로 이어집니다.")}</span>
      <div className="landing-actions"><Link href="/planner">내 여행 설계하기 <b aria-hidden="true">→</b></Link><a href="#story">{t("learn", "어떻게 작동하나요?")}</a></div>
    </div>
    <div className="landing-signal" role="img" aria-label="내 편의조건에서 시작해 근거가 있는 장소, 일정과 이동, 상황 대응으로 이어지는 W.A.V.E 여행 설계 흐름" data-land-reveal>
      <div className="signal-demo" aria-hidden="true">
        <header><span>오늘의 여행 흐름</span><b>창원 · 당일 여행</b></header>
        <svg className="signal-route" viewBox="0 0 640 300" preserveAspectRatio="none">
          <path className="signal-route-rail" d="M58 231 C126 217 145 103 236 112 S343 238 425 177 S497 66 585 79" />
          <path className="signal-route-current" d="M58 231 C126 217 145 103 236 112 S343 238 425 177 S497 66 585 79" />
        </svg>
        <span className="signal-node node-one"><i>1</i>{t("accessible", "내 편의조건")}</span>
        <span className="signal-node node-two"><i>2</i>{t("tourism", "근거 있는 장소")}</span>
        <span className="signal-node node-three"><i>3</i>{t("mobility", "일정과 이동")}</span>
        <span className="signal-node node-four"><i>4</i>{t("stories", "상황 대응")}</span>
        <span className="signal-traveler"><AccessIcon name="wheel" size={22} /></span>
        <footer><span>공식 편의정보</span><span>확인된 이동부터</span><b>출발 전 다시 확인</b></footer>
      </div>
    </div>
    <div className="landing-scroll" aria-hidden="true">기능을 아래에서 확인하세요 <i /></div>
  </section>;
}

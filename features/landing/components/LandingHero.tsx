import Link from "next/link";
import AccessIcon from "../../../components/AccessIcons";
import WaveField from "../../../components/WaveField";
import type { LandingTranslate } from "../content";

export default function LandingHero({ t }: { t: LandingTranslate }) {
  return <section className="landing-hero" id="top">
    <WaveField className="hero-wave-canvas" tone="light" mode="ambient" />
    <div className="landing-hero-copy" data-land-reveal>
      <p><span className="access-badge"><AccessIcon name="mark" size={18} />{t("heroBadge", "경상남도 무장애 여행")}</span> 2026 TOUR DATA</p>
      <h1>{t("heroTitle", "갈 수 있는 곳을 넘어,")}<br /><em>{t("heroEm", "가고 싶은 하루로.")}</em></h1>
      <span>{t("heroCopy", "W.A.V.E는 여행자의 이동 조건과 경남 관광 데이터를 연결해 장소 선택부터 실제 이동까지 설계하는 여행 동행 서비스입니다.")}</span>
      <div className="landing-actions"><Link href="/planner">여행 계획 만들기 <b>→</b></Link><a href="#story">{t("learn", "서비스 알아보기")}</a></div>
    </div>
    <div className="landing-signal" aria-label="서비스 데이터 흐름" data-land-reveal>
      <div className="signal-core"><span>W.A.V.E</span><small>TRAVEL ENGINE</small></div>
      <span className="signal-node node-one">{t("tourism", "관광정보")}</span><span className="signal-node node-two">{t("accessible", "무장애 정보")}</span><span className="signal-node node-three">{t("mobility", "이동 경로")}</span><span className="signal-node node-four">{t("stories", "지역 이야기")}</span>
    </div>
    <div className="landing-scroll" aria-hidden="true">SCROLL <i /></div>
  </section>;
}

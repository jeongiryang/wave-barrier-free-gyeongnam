import GithubFooterLink from "../../../components/GithubFooterLink";
import PolicyFooterLinks from "../../../components/PolicyFooterLinks";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function PlannerFooter() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <footer className="simple-footer">
    <div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div>
    <div className="footer-notes"><p>{en ? "A Gyeongnam travel guide for everyone's access needs" : "누구나 원하는 곳으로, 경남 무장애 여행 길잡이"}</p><p className="trust-notice">{en ? "W.A.V.E is an independent service using public tourism information. It is not operated by the Korea Tourism Organization or Gyeongsangnam-do." : "W.A.V.E는 공공 관광정보를 연결해 제공하는 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다."}</p><PolicyFooterLinks /></div>
    <div className="footer-meta"><p className="source">{en ? "Sources: ⓒKorea Tourism Organization · ⓒKorea Tourism Content Lab" : "출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩"}</p><GithubFooterLink /></div>
  </footer>;
}

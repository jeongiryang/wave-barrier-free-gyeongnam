import GithubFooterLink from "../../../components/GithubFooterLink";

export default function PlannerFooter() {
  return <footer className="simple-footer">
    <div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div>
    <div className="footer-notes"><p>누구나 원하는 곳으로, 경남 무장애 여행 길잡이</p><p className="trust-notice">2026 관광데이터 활용 공모전 ②-2 웹·앱 구현 부문 · 지정과제 1 출품용 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다.</p></div>
    <div className="footer-meta"><p className="source">출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩</p><GithubFooterLink /></div>
  </footer>;
}

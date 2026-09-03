import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 운영정책",
  description: "W.A.V.E의 개인정보, 커뮤니티 운영, 서비스 신뢰와 이용 기준을 한곳에서 확인합니다.",
  alternates: { canonical: "/policies" },
};

const inquiryUrl = "https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues";

export default function PoliciesPage() {
  return <main className="policy-page policy-hub" id="main">
    <nav aria-label="정책 페이지 이동"><Link href="/">W.A.V.E 홈</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">서비스 이용약관</Link></nav>
    <header>
      <p>POLICY CENTER</p>
      <h1>안심하고 계획하고,<br />서로의 이동을 존중하도록.</h1>
      <span>정책 버전 1.0 · 시행일 2026년 9월 3일</span>
    </header>

    <section className="policy-summary" aria-labelledby="policy-summary-title">
      <div><p>운영 원칙</p><h2 id="policy-summary-title">정보의 출처와 한계를 숨기지 않습니다.</h2></div>
      <p>W.A.V.E는 공식 관광정보와 여행자 경험을 구분하고, 필요한 데이터만 처리하며, 신고와 장애를 확인 가능한 절차로 다룹니다. 중요한 정책 변경은 이 화면의 시행일과 변경 내용을 갱신해 알립니다.</p>
    </section>

    <div className="policy-link-grid" aria-label="정책 문서 바로가기">
      <Link href="/privacy"><span>01</span><strong>개인정보처리방침</strong><small>수집 항목 · 보관 · 파기 · 권리 행사</small><i aria-hidden="true">↗</i></Link>
      <Link href="/terms"><span>02</span><strong>서비스 이용약관</strong><small>서비스 범위 · 계정 · 게시물 · 책임</small><i aria-hidden="true">↗</i></Link>
      <a href="#community-policy"><span>03</span><strong>커뮤니티 운영정책</strong><small>작성 기준 · 신고 · 검토 · 이의제기</small><i aria-hidden="true">↓</i></a>
      <a href="#service-policy"><span>04</span><strong>서비스 운영정책</strong><small>정보 신뢰 · 장애 · 변경 · 중단</small><i aria-hidden="true">↓</i></a>
    </div>

    <article className="policy-article">
      <section id="community-policy">
        <p className="policy-section-kicker">COMMUNITY</p>
        <h2>커뮤니티 운영정책</h2>
        <p className="policy-lead">여행자의 실제 경험은 소중하지만 한 사람의 경험이 모든 사람의 이용 가능성을 보장하지는 않습니다. W.A.V.E는 공식 편의정보와 사용자 후기를 분리해 표시하고 다음 기준으로 공개 공간을 운영합니다.</p>
        <div className="policy-detail-grid">
          <section><h3>환영하는 내용</h3><ul><li>방문 시점과 실제 이용 조건이 드러나는 구체적인 경험</li><li>휠체어 이동, 보행, 감각·인지 지원과 관련된 확인 가능한 정보</li><li>시설이나 교통 정보가 바뀌었다는 정중한 수정 제보</li></ul></section>
          <section><h3>제한하는 내용</h3><ul><li>타인의 연락처·얼굴·건강정보 등 동의 없는 개인정보</li><li>혐오, 괴롭힘, 위협, 사칭, 불법행위 조장, 반복 광고</li><li>출처를 꾸미거나 공식 확인처럼 오해시키는 허위 정보</li></ul></section>
          <section><h3>신고와 임시조치</h3><p>로그인한 사용자는 같은 대상에 한 번 신고할 수 있고 하루 최대 10건으로 제한됩니다. 서로 다른 사용자 3명의 신고가 모이면 해당 내용은 자동으로 검토 상태가 되어 공개 목록에서 잠시 숨겨집니다.</p></section>
          <section><h3>검토와 이의제기</h3><p>운영자는 맥락, 최신성, 권리 침해와 안전 위험을 확인해 공개 유지·숨김을 결정합니다. 작성자 또는 신고자는 민감정보를 제외하고 운영 문의에 게시물 주소와 사유를 남겨 재검토를 요청할 수 있습니다.</p></section>
        </div>
        <aside className="policy-callout"><strong>조치 원칙</strong><p>최소한의 범위로 조치하고, 단순한 의견 차이만으로 삭제하지 않습니다. 다만 개인정보 노출, 구체적인 위해 가능성 또는 반복적인 서비스 방해는 즉시 숨김·이용 제한 대상이 될 수 있습니다.</p></aside>
      </section>

      <section id="service-policy">
        <p className="policy-section-kicker">OPERATIONS</p>
        <h2>서비스 운영정책</h2>
        <div className="policy-detail-grid">
          <section><h3>정보 신뢰 기준</h3><p>공식 제공처, 조회 시각, 확인됨·일부 확인·재확인 필요 상태를 함께 표시합니다. 공식 편의근거가 없는 항목은 확인된 것처럼 점수에 반영하지 않고, 사용자 제보는 별도 경험 정보로 둡니다.</p></section>
          <section><h3>장애와 성능 저하</h3><p>외부 데이터가 지연되거나 중단되면 추정값을 실제값으로 대체하지 않습니다. 핵심 화면과 API는 매일 자동 점검하며 새 배포에서 문제가 확인되면 직전 정상 배포로 되돌리는 절차를 사용합니다.</p></section>
          <section><h3>기능 변경과 중단</h3><p>안전, 보안, 제공처 정책, 법령 또는 운영 여건에 따라 기능을 변경하거나 일시 중단할 수 있습니다. 사용자 권리나 데이터 보관에 중요한 변경은 시행일 전에 정책 화면 또는 서비스 안에서 알립니다.</p></section>
          <section><h3>연락과 처리 기록</h3><p>오류·접근성 문제·정책 이의는 <a href={inquiryUrl} target="_blank" rel="noreferrer">W.A.V.E 운영 문의</a>에서 접수합니다. 공개 문의에는 이메일, 전화번호, 비밀번호, 인증 링크 등 민감정보를 적지 않아야 합니다.</p></section>
        </div>
      </section>
    </article>

    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">서비스 이용약관</Link></footer>
  </main>;
}

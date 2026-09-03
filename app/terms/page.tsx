import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 이용약관",
  description: "W.A.V.E의 서비스 범위, 계정, 사용자 콘텐츠와 운영 기준을 안내합니다.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <main className="policy-page" id="main">
    <nav aria-label="정책 페이지 이동"><Link href="/">W.A.V.E 홈</Link><Link href="/policies">운영정책</Link><Link href="/privacy">개인정보처리방침</Link></nav>
    <header><p>TERMS OF SERVICE</p><h1>여행 결정에 필요한 근거와<br />확인할 한계를 함께 봅니다.</h1><span>약관 버전 1.0 · 시행일 2026년 9월 3일</span></header>

    <aside className="policy-callout policy-callout-primary"><strong>먼저 확인해 주세요</strong><p>W.A.V.E는 여행 계획을 돕는 독립 정보 서비스입니다. 예약·운송·시설 운영 주체가 아니며 특정 장소나 경로의 실제 이용 가능성을 보증하지 않습니다.</p></aside>

    <nav className="policy-toc" aria-label="서비스 이용약관 목차"><a href="#terms-purpose">목적·범위</a><a href="#terms-account">계정</a><a href="#terms-content">사용자 콘텐츠</a><a href="#terms-conduct">이용 기준</a><a href="#terms-operation">운영·변경</a><a href="#terms-liability">책임·문의</a></nav>

    <article className="policy-article policy-terms">
      <section id="terms-purpose"><p className="policy-section-kicker">제1조 · 목적과 서비스 범위</p><h2>여행 판단을 돕는 정보 서비스</h2><p>이 약관은 W.A.V.E와 사용자의 서비스 이용 기준을 정합니다. W.A.V.E는 경상남도 무장애 여행을 위해 공식 관광·편의·날씨·교통·지도 정보와 여행자 경험을 연결하고, 조건별 추천·일정·경로·공유 기능을 제공합니다.</p><p>W.A.V.E는 한국관광공사, 경상남도, 지도·교통·숙박·시설 제공기관의 공식 운영 서비스가 아닙니다. 실제 예약, 운송, 시설 제공과 현장 안전에 관한 계약은 각 제공기관과 사용자 사이에 성립합니다.</p></section>

      <section id="terms-account"><p className="policy-section-kicker">제2조 · 계정과 접근</p><h2>핵심 기능은 비회원, 참여 기능은 회원</h2><div className="policy-detail-grid"><section><h3>비회원 이용</h3><p>여행 설계, 지도, 이 기기 일정·여행집, 공유 여행 열람과 공개 후기 읽기는 가입 없이 이용할 수 있습니다.</p></section><section><h3>회원 이용</h3><p>커뮤니티 글·댓글·좋아요·신고와 계정 관리는 로그인이 필요합니다. 사용자는 자신이 이용할 수 있는 이메일과 안전한 비밀번호를 사용하고 인증 링크와 세션을 타인에게 넘기지 않아야 합니다.</p></section><section><h3>계정 복구</h3><p>등록 이메일로 비밀번호를 재설정하고 로그인 뒤 비밀번호를 변경할 수 있습니다. 계정 공유나 타인 사칭으로 생긴 문제는 확인을 위해 이용이 일시 제한될 수 있습니다.</p></section><section><h3>탈퇴</h3><p>계정 관리에서 탈퇴를 요청할 수 있습니다. 자동 탈퇴가 인증 제공처 상태로 완료되지 않으면 운영 문의를 통해 계정과 연결 데이터의 수동 삭제를 요청할 수 있습니다.</p></section></div></section>

      <section id="terms-content"><p className="policy-section-kicker">제3조 · 사용자 콘텐츠</p><h2>권리는 작성자에게, 공개에 필요한 범위만 서비스에</h2><p>게시글·댓글·장소 제보의 권리는 작성자 또는 정당한 권리자에게 있습니다. 사용자는 자신이 작성할 권리가 있는 내용만 올려야 하며, 공개한 콘텐츠에 대해 W.A.V.E가 서비스 안에서 저장·표시·검색·형식 조정하고 운영정책에 따라 검토할 수 있는 비독점적 권한을 부여합니다. 이 권한은 서비스 제공과 운영에 필요한 범위로 한정되며 콘텐츠 삭제 시 종료됩니다. 다만 보안 기록, 분쟁 처리 또는 법령상 보존이 필요한 부분은 예외가 될 수 있습니다.</p><p>공식 관광정보와 사용자 경험은 서로 다른 출처로 표시됩니다. 게시물이 공개되더라도 W.A.V.E가 그 정확성이나 특정 이용자의 접근 가능성을 공식 확인했다는 뜻은 아닙니다.</p></section>

      <section id="terms-conduct"><p className="policy-section-kicker">제4조 · 이용 기준과 조치</p><h2>다른 사람의 안전과 권리를 해치지 않기</h2><ul className="policy-list"><li>타인의 개인정보·계정·저작물을 무단 수집하거나 공개하는 행위</li><li>혐오, 괴롭힘, 위협, 사칭, 불법행위 조장 또는 고의적인 허위 안전정보 게시</li><li>악성 코드, 서비스 방해, 취약점 악용, 접근 권한 우회, 자동화된 과도한 요청</li><li>반복 광고, 검색 순위 조작, 신고 기능 남용 또는 운영자 사칭</li></ul><p>위반 가능성이 있으면 콘텐츠를 임시 숨김 또는 삭제하고 기능·계정 이용을 제한할 수 있습니다. 조치는 위험과 반복성에 비례해 최소 범위로 적용하며, 자세한 신고·검토·이의제기 절차는 <Link href="/policies#community-policy">커뮤니티 운영정책</Link>을 따릅니다.</p></section>

      <section id="terms-operation"><p className="policy-section-kicker">제5조 · 정보, 변경과 중단</p><h2>변하는 현장 정보를 단정하지 않습니다.</h2><div className="policy-detail-grid"><section><h3>정보 최신성</h3><p>시설 운영, 공사, 날씨와 교통은 조회 뒤 달라질 수 있습니다. 출발 전 시설 운영기관과 실제 이동 제공처의 최신 정보를 확인해야 합니다.</p></section><section><h3>추천과 예측</h3><p>추천은 선택 조건과 확인 가능한 공식 편의정보를 바탕으로 하며 모든 사람의 이용 가능성을 보장하지 않습니다. 임시 경로와 예측값은 실제 경로·실시간 인원과 구분합니다.</p></section><section><h3>외부 서비스</h3><p>지도, 교통, 관광, 날씨, 인증 또는 호스팅 제공처의 장애·정책 변경으로 일부 기능이 제한될 수 있습니다. 이때 추정값을 실제 응답처럼 표시하지 않습니다.</p></section><section><h3>서비스 변경</h3><p>안전, 보안, 법령, 제공처 또는 운영 여건에 따라 기능을 바꾸거나 중단할 수 있습니다. 사용자 권리나 저장 데이터에 중요한 변경은 합리적인 기간 전에 서비스 화면으로 알립니다.</p></section></div></section>

      <section id="terms-liability"><p className="policy-section-kicker">제6조 · 책임, 준거와 문의</p><h2>확인 가능한 범위에서 책임 있게 운영합니다.</h2><p>W.A.V.E는 합리적인 보안·검증·복구 절차로 서비스를 운영하지만 천재지변, 통신망, 외부 제공처, 사용자의 기기·권한 설정 등 통제하기 어려운 사유로 중단되거나 정보가 달라질 수 있습니다. 법령상 배제할 수 없는 책임은 이 약관으로 제한하지 않습니다. 긴급한 구조·의료·교통 안전 판단에는 관계 기관과 현장 안내를 우선해야 합니다.</p><p>약관과 서비스 이용에 관한 문의는 <a href="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues" target="_blank" rel="noreferrer">W.A.V.E 운영 문의</a>로 접수합니다. 공개 문의에는 개인정보나 인증정보를 작성하지 마세요. 대한민국 법령을 기준으로 운영하며 분쟁은 당사자 사이의 협의를 우선합니다.</p><p className="policy-note">이 약관은 2026년 9월 3일부터 시행합니다. 중요한 변경은 버전과 시행일을 갱신해 공개합니다.</p></section>
    </article>
    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/policies">운영정책 보기</Link><Link href="/privacy">개인정보처리방침</Link></footer>
  </main>;
}

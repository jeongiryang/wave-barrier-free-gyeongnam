import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 안내",
  description: "W.A.V.E가 사용하는 정보와 저장 위치, 사용자 선택권을 안내합니다.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <main className="policy-page" id="main">
    <nav aria-label="정책 페이지 이동"><Link href="/">W.A.V.E 홈</Link><Link href="/terms">이용 안내</Link></nav>
    <header><p>개인정보 안내</p><h1>필요한 정보만,<br />쓰임과 저장 위치를 분명하게.</h1><span>시행일 2026년 9월 2일</span></header>
    <div className="policy-grid">
      <section><h2>계정과 커뮤니티</h2><p>여행 설계와 지도는 로그인 없이 이용할 수 있습니다. 계정을 만들면 인증 제공처가 이메일과 인증 정보를 처리하고, W.A.V.E는 커뮤니티 표시 이름·게시글·댓글·좋아요·신고 상태를 계정 식별자와 연결합니다. 애플리케이션 데이터베이스에는 비밀번호를 저장하지 않습니다.</p></section>
      <section><h2>기기 안에 저장하는 정보</h2><p>화면 색상·언어·동작 효과, 여행 조건, 이 기기 일정과 여행집 메모는 브라우저 저장소에 보관됩니다. 원본 사진, 사진의 위치정보, 정확한 출발지와 계정 정보는 여행집에 저장하지 않습니다. 브라우저 데이터를 지우면 함께 삭제될 수 있습니다.</p></section>
      <section><h2>외부 제공처와 위치</h2><p>관광·날씨·교통·지도 정보를 확인할 때 선택 지역, 장소 또는 경로에 필요한 좌표가 각 제공처로 전송될 수 있습니다. 현재 위치는 사용자가 허용한 경우에만 브라우저에서 경로 계산에 사용하며 W.A.V.E 데이터베이스에 저장하지 않습니다.</p></section>
      <section><h2>보관과 사용자 선택</h2><p>커뮤니티 글과 댓글은 사용자가 삭제하거나 운영 기준에 따라 숨길 수 있습니다. 공유 일정은 생성 시 안내된 기간 동안 보관됩니다. 계정 삭제와 비밀번호 재설정은 현재 서비스 화면에서 제공하지 않으므로 가입 전에 이 제한을 확인해 주세요.</p></section>
      <section><h2>추적과 보안</h2><p>애플리케이션 코드는 광고 추적기를 연결하지 않습니다. 인증 응답은 브라우저·공유 캐시에 남지 않도록 제한하고, 상태 변경 요청에는 출처·요청 크기·소유권 검사를 적용합니다.</p></section>
      <section><h2>문의와 요청</h2><p>공개되지 않아야 할 개인정보를 발견했거나 운영 요청이 필요하면 커뮤니티 신고 기능을 이용할 수 있습니다. 계정 관련 요청은 <a href="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues" target="_blank" rel="noreferrer">W.A.V.E 운영 문의</a>에 민감정보를 적지 말고 남겨 주세요.</p></section>
    </div>
    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/terms">이용 안내 읽기</Link></footer>
  </main>;
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "서비스 이용 안내",
  description: "W.A.V.E의 정보 범위와 이용 전 확인 사항을 안내합니다.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <main className="policy-page" id="main">
    <nav aria-label="정책 페이지 이동"><Link href="/">W.A.V.E 홈</Link><Link href="/privacy">개인정보 안내</Link></nav>
    <header><p>서비스 이용 안내</p><h1>여행 결정에 필요한 근거와<br />확인할 한계를 함께 봅니다.</h1><span>시행일 2026년 9월 2일</span></header>
    <div className="policy-grid">
      <section><h2>서비스의 역할</h2><p>W.A.V.E는 경남 여행의 편의조건, 공식 관광정보, 이동·날씨 정보를 연결해 계획을 돕는 독립 서비스입니다. 한국관광공사·경상남도 또는 교통·지도 제공기관의 공식 운영 서비스가 아닙니다.</p></section>
      <section><h2>정보의 기준</h2><p>확인됨, 일부 확인, 재확인 필요를 구분하고 출처와 조회 시각을 표시합니다. 시설 운영, 공사, 날씨와 교통은 출발 전 달라질 수 있으므로 장소 운영기관과 실제 이동 제공처의 최신 정보를 다시 확인해야 합니다.</p></section>
      <section><h2>추천과 이동</h2><p>추천은 사용자가 고른 조건과 확인 가능한 공식 편의정보를 바탕으로 합니다. 점수나 추천 순위가 모든 사용자의 이용 가능성을 보장하지 않습니다. 조회하지 못한 경로·예측값·임시 이동시간은 실제 경로와 구분해 표시합니다.</p></section>
      <section><h2>커뮤니티</h2><p>사용자 작성 경험은 공식 관광정보와 별도 출처로 표시됩니다. 개인정보, 권리 침해, 혐오·비방, 광고성 콘텐츠는 신고 또는 운영 검토에 따라 숨겨질 수 있습니다. 샘플 콘텐츠는 실제 사용자 후기가 아님을 화면에 표시합니다.</p></section>
      <section><h2>계정과 기능 범위</h2><p>계정은 커뮤니티 참여를 위한 선택 기능입니다. 가입·로그인·로그아웃 외 비밀번호 재설정과 계정 탈퇴는 현재 제공하지 않습니다. 여행 설계, 지도, 이 기기 일정과 공개 후기 읽기는 계정 없이 이용할 수 있습니다.</p></section>
      <section><h2>안전한 이용</h2><p>서비스를 방해하거나 다른 사용자의 계정·콘텐츠에 접근하려는 행위, 자동화된 과도한 요청과 악성 파일 업로드를 허용하지 않습니다. 긴급한 이동·안전 판단은 이 서비스만을 근거로 결정하지 마세요.</p></section>
    </div>
    <footer><Link href="/">서비스로 돌아가기</Link><Link href="/privacy">개인정보 안내 읽기</Link></footer>
  </main>;
}

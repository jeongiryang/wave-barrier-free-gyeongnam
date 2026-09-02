import Link from "next/link";
import PublicMobileNav from "../../../components/PublicMobileNav";
import SkipLink from "../../../components/SkipLink";
import type { AuthMode } from "../types";
import AuthForm from "./AuthForm";
import AuthMotionHeadline from "./AuthMotionHeadline";

export default function AuthShell({ mode, returnTo }: { mode: AuthMode; returnTo?: string }) {
  const registering = mode === "register";
  return (
    <main className="auth-page">
      <SkipLink href="#auth-title">계정 입력으로 바로가기</SkipLink>
      <header className="auth-header">
        <Link className="brand" href="/" aria-label="W.A.V.E 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></Link>
        <nav aria-label="주요 메뉴"><Link href="/">서비스 소개</Link><Link href="/planner">여행 계획</Link><Link href="/community">여행 후기</Link></nav>
        <div className="auth-header-actions"><PublicMobileNav links={[
          { href: "/", label: "서비스 소개" },
          { href: "/planner", label: "여행 계획" },
          { href: "/travel-book", label: "내 여행집" },
          { href: "/community", label: "여행 후기" },
        ]} /><Link className="auth-header-action" href="/planner">로그인 없이 여행 설계 <span aria-hidden="true">↗</span></Link></div>
      </header>
      <div className="auth-layout">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <p className="section-kicker">{registering ? "W.A.V.E 계정 시작" : "다시 만난 여행자"}</p>
          <AuthMotionHeadline mode={mode} />
          <p>계정은 커뮤니티 참여를 위한 선택입니다. 관광지 추천, 일정 설계, 지도와 이동 정보는 누구나 바로 이용할 수 있습니다.</p>
          <div className="auth-journey-preview" aria-label="계정으로 이어지는 서비스 가치">
            <span><i>01</i><b>관광지 이야기</b><small>장소와 지역을 연결해 질문하고 후기를 남겨요.</small></span>
            <span><i>02</i><b>안전한 참여</b><small>본인 글과 댓글만 수정·삭제할 수 있어요.</small></span>
            <span><i>03</i><b>열린 여행 설계</b><small>로그인하지 않아도 핵심 여행 기능은 그대로 열려 있어요.</small></span>
          </div>
        </section>
        <AuthForm mode={mode} returnTo={returnTo} />
      </div>
    </main>
  );
}

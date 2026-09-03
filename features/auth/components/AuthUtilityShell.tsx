import Link from "next/link";
import type { ReactNode } from "react";
import PublicMobileNav from "../../../components/PublicMobileNav";
import SkipLink from "../../../components/SkipLink";

export default function AuthUtilityShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <SkipLink href="#auth-title">계정 관리로 바로가기</SkipLink>
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
      <div className="auth-layout auth-utility-layout">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <p className="section-kicker">{eyebrow}</p>
          <h1 id="auth-story-title">계정도 여행처럼,<br /><span>내 선택으로 관리해요.</span></h1>
          <p>{description}</p>
          <div className="auth-journey-preview" aria-label="계정 관리 원칙">
            <span><i>01</i><b>필요할 때 복구</b><small>등록한 이메일로 비밀번호를 안전하게 다시 설정해요.</small></span>
            <span><i>02</i><b>직접 관리</b><small>로그인한 계정의 비밀번호와 탈퇴를 한곳에서 처리해요.</small></span>
            <span><i>03</i><b>흔적까지 정리</b><small>탈퇴하면 서버의 게시글·댓글·좋아요·신고도 함께 삭제해요.</small></span>
          </div>
        </section>
        <section className="auth-card auth-utility-card" aria-labelledby="auth-title">
          <p className="auth-kicker">{eyebrow}</p>
          <h2 id="auth-title">{title}</h2>
          {children}
        </section>
      </div>
    </main>
  );
}

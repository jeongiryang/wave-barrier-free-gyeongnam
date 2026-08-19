import AuthForm from "./AuthForm";

/* eslint-disable @next/next/no-html-link-for-pages */

export default function AuthShell({ mode, returnTo }: { mode: "login" | "register"; returnTo?: string }) {
  const registering = mode === "register";
  return (
    <main className="auth-page">
      <a className="skip-link" href="#auth-title">계정 입력으로 바로가기</a>
      <header className="auth-header">
        <a className="brand" href="/" aria-label="W.A.V.E 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></a>
        <nav aria-label="주요 메뉴"><a href="/">서비스 소개</a><a href="/planner">여행 설계</a><a href="/community">커뮤니티</a></nav>
        <a className="auth-header-action" href="/planner">로그인 없이 여행 설계 <span aria-hidden="true">↗</span></a>
      </header>
      <div className="auth-layout">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <p className="section-kicker">{registering ? "START YOUR W.A.V.E" : "WELCOME BACK"}</p>
          <h2 id="auth-story-title">{registering ? <>여행의 조건도,<br />다녀온 경험도<br /><em>나답게 이어집니다.</em></> : <>내가 고른 장소에서<br />여행자의 이야기까지<br /><em>한 흐름으로.</em></>}</h2>
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

"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-state-page" role="alert">
      <div className="route-state-mark" aria-hidden="true">!</div>
      <p>CONNECTION PAUSE</p>
      <h1>잠시 연결이 흔들렸습니다.</h1>
      <span>작성 중인 조건은 브라우저에 남아 있습니다. 같은 화면을 다시 불러오거나 여행 설계로 돌아가 주세요.</span>
      <div>
        <button type="button" onClick={reset}>이 화면 다시 시도</button>
        <Link href="/planner">여행 설계로 돌아가기</Link>
      </div>
    </main>
  );
}

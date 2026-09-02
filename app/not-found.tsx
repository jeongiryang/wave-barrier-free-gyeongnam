import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="route-state-page">
      <div className="route-state-mark" aria-hidden="true">404</div>
      <p>여행 경로를 찾지 못했습니다</p>
      <h1>이 여행 경로는 찾을 수 없습니다.</h1>
      <span>주소가 잘못됐거나 30일 보관 기간이 지난 공유 여행일 수 있습니다.</span>
      <div>
        <Link className="primary" href="/planner">새 여행 만들기</Link>
        <Link href="/">서비스 소개 보기</Link>
      </div>
    </main>
  );
}

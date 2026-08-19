export default function LoadingPage() {
  return (
    <main className="route-state-page loading" role="status" aria-live="polite">
      <div className="route-state-wave" aria-hidden="true"><i /><i /><i /></div>
      <p>W.A.V.E DATA</p>
      <h1>여행 정보를 연결하고 있습니다.</h1>
      <span>공식 관광정보와 화면을 안전하게 준비하는 중입니다.</span>
    </main>
  );
}

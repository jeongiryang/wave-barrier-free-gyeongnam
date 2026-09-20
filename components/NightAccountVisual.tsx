import Link from "next/link";

export default function NightAccountVisual() {
  return <aside className="night-account-visual" aria-label="WAVE 여행">
    <div><p>WAVE · 경남 무장애 여행</p><h2>더 넓은 세상을<br/><span>함께, WAVE</span></h2><p>마음에 드는 장소를 담고<br/>나만의 여행을 이어가세요.</p><Link href="/planner">여행지 둘러보기 <span aria-hidden="true">→</span></Link></div>
  </aside>;
}

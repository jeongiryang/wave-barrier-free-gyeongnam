import type { ReactNode } from "react";
import Link from "next/link";
import CommunityHeader from "../../components/CommunityHeader";
import SkipLink from "../../components/SkipLink";
export default function TravelShell({ title, children, compact = false }: { title: string; children: ReactNode; compact?: boolean }) {
  return <main className={`travel-book-page wave-night night-secondary${compact ? " personal-trip-page" : ""}`}><SkipLink href="#account-travel">내 여행으로 바로가기</SkipLink><CommunityHeader current="travel-book" /><section className="travel-book-hero"><div><p>WAVE · 여행과 이용 안내</p><h1>{title}</h1></div></section><div className="travel-book-list" id="account-travel" tabIndex={-1}>{children}</div><footer className="travel-book-footer"><Link href="/planner">여행 계획</Link><Link href="/travel-book">저장한 일정</Link><Link href="/guide">사용 방법</Link><Link href="/privacy">개인정보</Link></footer></main>;
}

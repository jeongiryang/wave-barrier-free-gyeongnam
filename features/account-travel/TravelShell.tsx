import type { ReactNode } from "react";
import Link from "next/link";
import CommunityHeader from "../../components/CommunityHeader";
import SkipLink from "../../components/SkipLink";
export default function TravelShell({ title, children, compact = false }: { title: string; children: ReactNode; compact?: boolean }) {
  return <main className={`travel-book-page${compact ? " personal-trip-page" : ""}`}><SkipLink href="#account-travel">내 여행으로 바로가기</SkipLink><CommunityHeader current="travel-book" /><section className="travel-book-hero"><div><p>나의 경남, 함께 만드는 여행</p><h1>{title}</h1><span>기기를 바꿔도, 함께하는 사람이 늘어나도.<br />우리의 다음 여행은 이곳에서 이어집니다.</span></div><dl><div><dt>저장하고</dt><dd>이어가기</dd></div><div><dt>공유하고</dt><dd>함께하기</dd></div></dl></section><div className="travel-book-list" id="account-travel" tabIndex={-1}>{children}</div><footer className="travel-book-footer"><Link href="/planner">여행 계획</Link><Link href="/travel-book">저장한 일정</Link><Link href="/guide">사용 방법</Link><Link href="/privacy">개인정보</Link></footer></main>;
}

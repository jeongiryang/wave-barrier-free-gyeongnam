export default function CommunityHero({ writeHref }: { writeHref: string }) {
  return <section className="community-hero community-editorial" lang="ko" aria-labelledby="community-title">
    <div><p className="section-kicker">우리의 여행이 만나는 곳</p><h1 id="community-title">여행은 끝나도,<br /><em>이야기는 이어져요.</em></h1><p>마음에 남은 장면과 다음 여행의 질문.<br />서로의 하루를 나눠보세요.</p><p className="community-editorial-note">공개 글은 누구나 읽고, 글과 댓글은 로그인 후 나눌 수 있어요.</p></div>
    <a className="community-write" href={writeHref}>후기 작성 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5ZM3 23h18" /></svg></a>
  </section>;
}

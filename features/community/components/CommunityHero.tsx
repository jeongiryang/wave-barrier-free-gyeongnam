export default function CommunityHero({ writeHref }: { writeHref: string }) {
  return <section className="community-task-heading" lang="ko" aria-labelledby="community-title">
    <h1 id="community-title">질문·후기</h1>
    <a className="community-write" href={writeHref}>글 쓰기 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5ZM3 23h18" /></svg></a>
  </section>;
}

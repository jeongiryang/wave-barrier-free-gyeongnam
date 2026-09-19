/**
 * 주요 메뉴 아이콘 세트.
 *
 * 글을 빨리 읽기 어려운 사용자와 처음 온 사용자가 목적지를 더 빨리 찾도록
 * 메뉴 글자 옆에 뜻이 분명한 그림을 함께 둔다. 그림은 글자를 대체하지 않으며
 * 기본값은 장식(aria-hidden)이다. 접근 가능한 이름은 링크의 글자에서 나온다.
 *
 * 편의시설 아이콘(components/AccessIcons.tsx)과 의미를 섞지 않으려고 파일을 나눈다.
 * 격자·선 두께·선 끝 처리는 docs/design-system.md 7절을 그대로 따른다.
 */

export type NavIconName = "intro" | "planner" | "festivals" | "community";

const PATHS: Record<NavIconName, React.ReactNode> = {
  // 서비스 소개 — 물결 두 줄
  intro: (
    <>
      <path d="M2.6 9.4c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0 3.2 1.6 4.4 0" />
      <path d="M2.6 15.6c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0 3.2 1.6 4.4 0" />
    </>
  ),
  // 여행 설계 — 지도 위 경로 점과 선
  planner: (
    <>
      <path d="M3 6.4 9 4.2l6 2.2 6-2.2v13.4l-6 2.2-6-2.2-6 2.2z" />
      <path d="M8 9.2c1.8 1 3 2.4 3.6 4.2.7-2.6 2.2-4.2 4.4-5" />
      <circle cx="7.4" cy="8.6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16.6" cy="14.6" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // 축제 — 달력 한 장에 별 하나
  festivals: (
    <>
      <rect x="3.2" y="5" width="17.6" height="15.8" rx="2.2" />
      <path d="M3.2 9.6h17.6" />
      <path d="M7.8 3.2v3.4M16.2 3.2v3.4" />
      <path d="m12 11.8 1.4 2.9 3.2.5-2.3 2.2.5 3.2-2.8-1.5-2.8 1.5.5-3.2-2.3-2.2 3.2-.5z" />
    </>
  ),
  // 커뮤니티 — 말풍선 두 개
  community: (
    <>
      <path d="M3 5.6a1.6 1.6 0 0 1 1.6-1.6h9.2a1.6 1.6 0 0 1 1.6 1.6v5.2a1.6 1.6 0 0 1-1.6 1.6H8.2L4.6 15.4v-2.6a1.6 1.6 0 0 1-1.6-1.6z" />
      <path d="M18 8.4h1.4A1.6 1.6 0 0 1 21 10v5.2a1.6 1.6 0 0 1-1.6 1.6v2.6l-3.6-2.6h-3.6" />
    </>
  ),
};

export default function NavIcon({
  name,
  size = 20,
  className,
}: {
  name: NavIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      {PATHS[name]}
    </svg>
  );
}

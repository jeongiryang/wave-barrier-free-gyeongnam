/**
 * 접근성 조건 아이콘 세트.
 *
 * 이모지(♿ ◌ ♧)는 글꼴에 따라 모양이 달라지고 화면 낭독기가 읽는 방식도
 * 제각각이라, 같은 격자·같은 선 두께로 그린 SVG로 통일한다.
 * 색은 currentColor를 상속하므로 밝은 면에서도 짙은 면에서도 그대로 쓸 수 있다.
 */

export type AccessIconName = "wheel" | "senior" | "baby" | "pregnant" | "visual" | "hearing" | "mark";

const PATHS: Record<AccessIconName, React.ReactNode> = {
  // 휠체어 이용 — 바퀴를 밀며 앞으로 나아가는 자세
  wheel: (
    <>
      <circle cx="9" cy="8" r="1.9" fill="currentColor" stroke="none" />
      <path d="M9 11.4v3.4h4.2l2.1 4.6" />
      <path d="M9.4 12.6h4.4" />
      <circle cx="12.4" cy="15.6" r="5.4" />
    </>
  ),
  // 걷기 불편 — 지팡이를 짚은 보행
  senior: (
    <>
      <circle cx="12.6" cy="4.4" r="1.9" fill="currentColor" stroke="none" />
      <path d="M12.6 8v5.6l2.6 3.2.8 3.6" />
      <path d="M12.6 13.6 9.6 16l-.8 3.8" />
      <path d="M16.6 9.4v10.6" />
    </>
  ),
  // 영유아 동반 — 유모차
  baby: (
    <>
      <path d="M4 4.2h1.9l1.6 3.4" />
      <path d="M7.5 7.6h11.7a7 7 0 0 1-7 7h-.4a4.3 4.3 0 0 1-4.3-4.3z" />
      <path d="M12 14.6v3.2" />
      <circle cx="8.6" cy="19.4" r="1.7" />
      <circle cx="16.4" cy="19.4" r="1.7" />
    </>
  ),
  // 임산부
  pregnant: (
    <>
      <circle cx="11.4" cy="4.2" r="1.9" fill="currentColor" stroke="none" />
      <path d="M11.4 7.8c-1.7 0-2.6 1.3-2.6 3v9.4" />
      <path d="M11.4 10.2c2.4 0 4 1.6 4 3.6s-1.6 3.4-4 3.4h-2.6" />
      <path d="M12.6 17.2v3" />
    </>
  ),
  // 시각 정보 지원 — 점자 배열
  visual: (
    <>
      <path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  // 청각 정보 지원 — 귀와 음파
  hearing: (
    <>
      <path d="M7.4 8.6a4.4 4.4 0 0 1 8.8 0c0 2.6-2.6 3.4-3.4 5.2-.5 1.1-.3 2-1.4 2.6" />
      <path d="M8.6 18.4c.9 1.3 2.2 1.9 3.6 1.6" />
      <path d="M17.8 5.2a7 7 0 0 1 1.8 4.6" />
    </>
  ),
  // 서비스 마크 — 파도 위의 무장애 심볼
  mark: (
    <>
      <circle cx="9.4" cy="5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M9.4 8.2v3.4h3.8l1.8 3.6" />
      <circle cx="11.6" cy="13.2" r="4.6" />
      <path d="M2.6 20.6c1.6-1.4 3.2-1.4 4.8 0s3.2 1.4 4.8 0 3.2-1.4 4.8 0 3.2 1.4 4.4 0" />
    </>
  ),
};

export default function AccessIcon({
  name,
  label,
  size = 24,
  className,
}: {
  name: AccessIconName;
  /** 의미를 담은 아이콘이면 넣는다. 없으면 장식으로 보고 낭독기에서 감춘다. */
  label?: string;
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
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    >
      {PATHS[name]}
    </svg>
  );
}

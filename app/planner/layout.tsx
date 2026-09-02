import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "경남 무장애 여행 계획",
  description: "이동·편의 조건에 맞는 경남 여행지를 공식 근거로 고르고 경로, 일정과 출발 준비를 확인하세요.",
  path: "/planner",
});

export default function PlannerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

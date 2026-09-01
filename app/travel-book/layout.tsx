import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 여행집",
  description: "완성한 경남 여행 일정을 이 기기에 보관하고 메모·사진 코스·여행 후기로 이어가는 W.A.V.E 로컬 여행집입니다.",
};

export default function TravelBookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

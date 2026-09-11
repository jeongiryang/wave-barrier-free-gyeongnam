import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "내 일정",
  description: "완성한 경남 여행 일정을 저장하고 다시 확인하는 WAVE 내 일정입니다.",
  path: "/travel-book",
});

export default function TravelBookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

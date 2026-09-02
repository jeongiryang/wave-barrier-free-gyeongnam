import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "사진으로 되찾는 여행 코스",
  description: "사진 원본을 업로드하지 않고 기기에서 촬영 순서를 읽어 경남 여행 코스를 다시 구성합니다.",
  path: "/photo-course",
});

export default function PhotoCourseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

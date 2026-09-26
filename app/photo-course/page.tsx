"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoCourseRestore from "../../features/photo-course/PhotoCourseRestore";
import WaveHeader from "../../components/WaveHeader";
import SkipLink from "../../components/SkipLink";

export default function PhotoCoursePage() {
  const router = useRouter();

  return <main className="photo-course-page wave-night night-secondary">
    <SkipLink href="#photo-course-main">본문으로 바로가기</SkipLink>
    <WaveHeader current="other" />
    <section className="photo-course-page-intro" id="photo-course-main">
      <p>PHOTO COURSE</p>
      <h1>사진 속 여행을<br />다시 코스로 연결해요.</h1>
      <span>다녀온 사진에서 여행의 순서를 찾고, 기억에 남는 장소를 다음 여행으로 이어 보세요.</span>
    </section>
    <PhotoCourseRestore onApply={({ region, travelStart, travelEnd }) => {
      const query = new URLSearchParams({ region, travelStart, travelEnd, from: "photo-course" });
      router.push(`/planner?${query.toString()}`);
    }} />
    <footer className="photo-course-page-footer">
      <Link href="/travel-book">내 여행집으로 돌아가기</Link>
    </footer>
  </main>;
}

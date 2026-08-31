"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PhotoCourseRestore from "../../features/photo-course/PhotoCourseRestore";

export default function PhotoCoursePage() {
  const router = useRouter();

  return <main className="photo-course-page">
    <a className="skip-link" href="#photo-course-main">본문으로 바로가기</a>
    <header className="photo-course-page-header">
      <Link href="/" className="photo-course-brand" aria-label="W.A.V.E 홈">W.A.V.E</Link>
      <nav aria-label="사진 코스 화면 이동">
        <Link href="/planner">여행 계획</Link>
        <Link href="/community">여행 후기</Link>
      </nav>
    </header>
    <section className="photo-course-page-intro" id="photo-course-main">
      <p>OPTIONAL · PHOTO COURSE</p>
      <h1>사진 속 여행을<br />다시 코스로 연결해요.</h1>
      <span>메인 여행 설계와 분리된 선택 기능입니다. 원본 사진과 GPS는 서버로 보내지 않습니다.</span>
    </section>
    <PhotoCourseRestore onApply={({ region, travelStart, travelEnd }) => {
      const query = new URLSearchParams({ region, travelStart, travelEnd, from: "photo-course" });
      router.push(`/planner?${query.toString()}`);
    }} />
    <footer className="photo-course-page-footer">
      <Link href="/planner">← 여행 계획으로 돌아가기</Link>
    </footer>
  </main>;
}

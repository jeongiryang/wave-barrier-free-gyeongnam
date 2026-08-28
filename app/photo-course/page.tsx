"use client";

import Link from "next/link";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import PhotoCourseRestore from "../../features/photo-course/PhotoCourseRestore";

export default function PhotoCoursePage() {
  const router = useRouter();
  const apply = useCallback(({ region, travelStart, travelEnd }: { region: string; travelStart: string; travelEnd: string }) => {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (travelStart) params.set("travelStart", travelStart);
    if (travelEnd) params.set("travelEnd", travelEnd);
    router.push(`/planner?${params.toString()}`);
  }, [router]);

  return <main className="photo-course-page">
    <a className="skip-link" href="#photo-course-main">본문으로 바로가기</a>
    <header className="photo-course-page-header">
      <Link className="brand" href="/" aria-label="W.A.V.E 소개 홈"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></Link>
      <div>
        <p>OPTIONAL TRAVEL TOOL</p>
        <h1>사진으로 지난 여행을 다시 이어보세요.</h1>
        <span>핵심 여행 설계 화면과 분리된 기기 내 분석 도구입니다.</span>
      </div>
      <Link className="photo-course-back" href="/planner">내 여행 만들기로 돌아가기 <span aria-hidden="true">→</span></Link>
    </header>
    <div id="photo-course-main" className="photo-course-page-body">
      <PhotoCourseRestore onApply={apply} />
    </div>
  </main>;
}

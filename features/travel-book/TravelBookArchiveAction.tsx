"use client";

import Link from "next/link";
import { useState } from "react";
import type { Place } from "../planner/types";
import { useTravelBook } from "./useTravelBook";

export default function TravelBookArchiveAction({ places, region, theme, profiles, travelStart, travelEnd, dayStartTime, scheduleAssignments }: {
  places: Place[];
  region: string;
  theme: string;
  profiles: string[];
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  scheduleAssignments: Record<string, string>;
}) {
  const { hydrated, archive } = useTravelBook();
  const [notice, setNotice] = useState("");

  return <div className="travel-book-archive-action">
    <div>
      <span>내 일정 저장</span>
      <strong>이 여행을 내 일정에 저장할까요?</strong>
      <p>일정과 공식 관광지 표지만 이 기기에 보관합니다. 계정·공유 링크 없이 다녀온 뒤 기록으로 이어갈 수 있어요.</p>
    </div>
    <div className="travel-book-archive-controls">
      <button type="button" disabled={!hydrated || !places.length} onClick={() => {
        const snapshot = archive({
          title: `${region} ${places.length}곳 여행`,
          region,
          theme,
          profiles,
          travelStart,
          travelEnd,
          dayStartTime,
          scheduleAssignments,
          places,
        });
        setNotice(snapshot ? "내 일정에 저장했어요. 같은 일정을 다시 저장하면 최신 순서로 바뀝니다." : "저장할 일정을 확인해 주세요.");
      }}>내 일정에 저장</button>
      <Link href="/travel-book">저장한 일정 보기 <span aria-hidden="true">→</span></Link>
    </div>
    <small role="status" aria-live="polite">{notice}</small>
  </div>;
}

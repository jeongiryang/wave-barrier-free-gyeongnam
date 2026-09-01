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
      <span>LOCAL TRAVEL BOOK</span>
      <strong>이 여행을 여행집에 남겨둘까요?</strong>
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
        setNotice(snapshot ? "여행집에 보관했습니다. 같은 일정을 다시 보관하면 최신 순서로 갱신됩니다." : "보관할 일정을 확인해 주세요.");
      }}>여행집에 보관</button>
      <Link href="/travel-book">내 여행집 열기 <span aria-hidden="true">→</span></Link>
    </div>
    <small role="status" aria-live="polite">{notice}</small>
  </div>;
}

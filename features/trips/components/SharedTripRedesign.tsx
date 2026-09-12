"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { emptyTrip, readTripValue, replaceCurrentTrip, THEMES_KEY } from "../../../lib/current-trip-storage.js";
import { selectedThemes } from "../../../lib/planner-criteria.js";
import { sanitizeTravelMode } from "../../../lib/trip-travel-mode.js";
import { boundedTripEnd, validTripDate } from "../../../lib/trip-dates.js";
import { regions } from "../../planner/constants";
import { usePlaceDialogFocus } from "../../planner/hooks/usePlaceDialogFocus";
import { localDate } from "../../planner/utils";
import type { SharedTrip } from "../types";

export default function SharedTripRedesign({ selections }: { selections: SharedTrip["selections"] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const cancel = useCallback(() => { setOpen(false); setError(false); }, []);
  const dialogRef = usePlaceDialogFocus(open, cancel);

  function start(confirmed = false) {
    setError(false);
    try {
      const saved = JSON.parse(readTripValue(window.localStorage, "wave-saved-places") || "[]");
      if (!Array.isArray(saved)) throw new Error("INVALID_CURRENT_TRIP");
      if (saved.length && !confirmed) { setOpen(true); return; }
      const region = regions.includes(selections.region || "") ? selections.region! : "";
      const start = validTripDate(selections.travelStart) ? selections.travelStart! : localDate();
      const end = boundedTripEnd(start, selections.travelEnd || start);
      const values = emptyTrip(region, start, end);
      replaceCurrentTrip(window.localStorage, {
        ...values,
        "wave-trip-schedule-v1": JSON.stringify({ ...JSON.parse(values["wave-trip-schedule-v1"]), travelMode: sanitizeTravelMode(selections.travelMode) }),
        [THEMES_KEY]: JSON.stringify(selectedThemes(selections.themes ?? selections.theme)),
      });
      router.push(`/planner?${new URLSearchParams({ region, travelStart: start, travelEnd: end })}#conditions`);
    } catch { setError(true); }
  }

  const notice = error && <p role="alert">변경 내용을 저장하지 못했어요. 현재 여행은 유지됩니다. 저장 권한을 확인한 뒤 다시 시도해 주세요.</p>;
  return <>
    <button className="shared-redesign" type="button" onClick={() => start()}>이 조건으로 다시 설계하기 →</button>
    {!open && notice}
    {open && <dialog ref={dialogRef} className="region-change-dialog" aria-labelledby="shared-redesign-title" aria-describedby="shared-redesign-description">
      <h2 id="shared-redesign-title" tabIndex={-1}>공유한 조건으로 새 여행을 시작할까요?</h2>
      <p id="shared-redesign-description">현재 편집 중인 일정은 비우고 공유 여행의 지역·날짜·활동·이동수단을 가져옵니다. 내 일정에 따로 보관한 여행은 유지합니다. 편의 조건은 직접 선택해 주세요.</p>
      {notice}
      <div><button type="button" onClick={cancel}>취소하고 현재 여행 유지</button><button type="button" onClick={() => start(true)}>공유 조건으로 새 여행 시작</button></div>
    </dialog>}
  </>;
}

"use client";

import { useState } from "react";

const reasons = [
  ["incorrect", "사실과 다른 정보"],
  ["unsafe", "여행 안전 우려"],
  ["spam", "광고·도배"],
  ["abuse", "비방·혐오 표현"],
  ["privacy", "개인정보 노출"],
  ["other", "기타 운영 위반"],
] as const;

export default function CommunityReportControl({ label, busy, onReport }: {
  label: string;
  busy: boolean;
  onReport: (reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  return <div className="community-report-control">
    <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>신고</button>
    {open && <div role="group" aria-label={`${label} 신고 이유`}>
      <p>운영팀에 전달할 이유를 선택해 주세요.</p>
      {reasons.map(([reason, reasonLabel]) => <button type="button" key={reason} disabled={busy} onClick={async () => { if (await onReport(reason)) setOpen(false); }}>{reasonLabel}</button>)}
    </div>}
  </div>;
}

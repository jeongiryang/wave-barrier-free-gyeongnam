"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

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
  const panelId = `community-report-${useId().replace(/:/g, "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAndRestoreFocus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeAndRestoreFocus, open]);

  return <div className="community-report-control">
    <button ref={triggerRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((current) => !current)}>신고</button>
    {open && <div ref={panelRef} id={panelId} role="group" aria-label={`${label} 신고 이유`}>
      <p>운영팀에 전달할 이유를 선택해 주세요.</p>
      {reasons.map(([reason, reasonLabel]) => <button type="button" key={reason} disabled={busy} onClick={async () => { if (await onReport(reason)) closeAndRestoreFocus(); }}>{reasonLabel}</button>)}
    </div>}
  </div>;
}

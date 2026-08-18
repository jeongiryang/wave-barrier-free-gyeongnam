"use client";

import { useEffect, useRef, useState } from "react";

export default function HelpCenter() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  return <>
    <button className="help-button" type="button" onClick={() => setOpen(true)} ref={triggerRef}>도움말 <span>?</span></button>
    {open && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" ref={dialogRef}>
        <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="도움말 닫기">×</button>
        <span className="dialog-kicker">처음 오셨나요?</span><h2 id="help-title">세 단계면 여행이 완성돼요.</h2>
        <ol>
          <li><b>1</b><div><strong>여행 조건 선택</strong><p>지역·관심사·필요한 편의시설을 고르세요.</p></div></li>
          <li><b>2</b><div><strong>추천 여행지 비교</strong><p>접근성 정보, 날씨, 예상 혼잡도를 함께 확인하세요.</p></div></li>
          <li><b>3</b><div><strong>지도에서 이동 준비</strong><p>출발지와 목적지를 정하고 교통편과 공식 예매처를 확인하세요.</p></div></li>
        </ol>
        <section><strong>현재 위치는 안전하게</strong><p>위치 권한을 허용해도 좌표는 이 브라우저 지도에서만 표시하며 서버·DB·공유 링크로 보내지 않습니다.</p></section>
        <p className="help-caution">편의시설 정보는 방문 전 운영기관에 한 번 더 확인해 주세요.</p>
        <button className="account-submit" type="button" onClick={() => setOpen(false)}>여행 만들기 계속하기</button>
      </div>
    </div>}
  </>;
}

"use client";

import { useEffect, useRef } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import WaveField from "../../../components/WaveField";

export default function LandingIntro({ close }: { close: () => void }) {
  const { t } = useSitePreferences();
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    startButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        startButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [close]);

  return <div className="brand-intro" role="dialog" aria-modal="true" aria-label="W.A.V.E 시작 화면">
    <WaveField className="brand-intro-canvas" tone="deep" mode="intro" wordmark="W.A.V.E" />
    <button ref={startButtonRef} type="button" onClick={close}>{t("use", "바로 시작")}</button>
    <div className="brand-intro-copy">
      <p>TRAVEL WITHOUT BARRIERS</p>
      <h1 aria-label="W.A.V.E">W.A.V.E</h1>
      <div className="intro-statement"><span>갈 수 있는 곳을 찾고</span><span>가고 싶은 하루를 만들고</span><strong>모두의 여행을 연결합니다.</strong></div>
    </div>
  </div>;
}

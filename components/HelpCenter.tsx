"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { useHelpTour } from "../features/help/useHelpTour";
import { useSitePreferences } from "./SitePreferences";

const subscribeClientReady = () => () => undefined;

export default function HelpCenter() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const ready = useSyncExternalStore(subscribeClientReady, () => true, () => false);
  const {
    open,
    steps,
    step,
    stepIndex,
    loading,
    loadFailed,
    highlight,
    spotlightStyle,
    dialogRef,
    triggerRef,
    startTour,
    closeTour,
    previousStep,
    nextStep,
  } = useHelpTour();

  const tourLayer = open && step ? <>
    <button className="help-tour-shield" type="button" onClick={closeTour} aria-label={en ? "Close help tour" : "도움말 투어 닫기"} />
    {highlight && <div className="help-tour-spotlight" style={spotlightStyle} aria-hidden="true" />}
    <div className="help-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="help-tour-title" aria-describedby="help-tour-copy" ref={dialogRef}>
      <button className="help-tour-close" type="button" onClick={closeTour} aria-label={en ? "Close help" : "도움말 닫기"}>×</button>
      <div className="help-tour-progress" role="img" aria-label={en ? `Step ${stepIndex + 1} of ${steps.length}` : `${steps.length}단계 중 ${stepIndex + 1}단계`}>
        {steps.map((item, index) => <i className={index <= stepIndex ? "active" : ""} key={item.selector} />)}
      </div>
      <span className="dialog-kicker">{step.eyebrow}</span>
      <h2 id="help-tour-title">{step.title}</h2>
      <p id="help-tour-copy" aria-live="polite">{step.copy}</p>
      <small>{en ? "The outline marks the area being described." : "강조된 테두리가 현재 설명하는 영역을 표시합니다."}</small>
      <div className="help-tour-actions">
        <button type="button" onClick={previousStep} disabled={stepIndex === 0}>{en ? "Previous" : "이전"}</button>
        <button type="button" className="primary" onClick={nextStep}>{stepIndex === steps.length - 1 ? en ? "Finish tour" : "투어 마치기" : en ? "Next area" : "다음 영역"}</button>
      </div>
    </div>
  </> : null;

  return <>
    <button className="help-button" type="button" onClick={() => void startTour()} ref={triggerRef} disabled={!ready} aria-busy={!ready || loading} aria-disabled={loading || undefined}>{en ? "Help" : "도움말"} <span aria-hidden="true">{loading ? "…" : "?"}</span></button>
    {loadFailed && typeof document !== "undefined" ? createPortal(<p className="help-load-message" role="alert">{en ? "Help could not be loaded. Reload the page and try again." : "도움말을 불러오지 못했습니다. 화면을 새로고침한 뒤 다시 시도해 주세요."}</p>, document.body) : null}
    {tourLayer && typeof document !== "undefined" ? createPortal(tourLayer, document.body) : null}
  </>;
}

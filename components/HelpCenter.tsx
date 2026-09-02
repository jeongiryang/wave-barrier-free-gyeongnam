"use client";

import { createPortal } from "react-dom";
import { useHelpTour } from "../features/help/useHelpTour";

export default function HelpCenter() {
  const {
    open,
    steps,
    step,
    stepIndex,
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
    <button className="help-tour-shield" type="button" onClick={closeTour} aria-label="도움말 투어 닫기" />
    {highlight && <div className="help-tour-spotlight" style={spotlightStyle} aria-hidden="true" />}
    <div className="help-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="help-tour-title" aria-describedby="help-tour-copy" ref={dialogRef}>
      <button className="help-tour-close" type="button" onClick={closeTour} aria-label="도움말 닫기">×</button>
      <div className="help-tour-progress" aria-label={`${steps.length}단계 중 ${stepIndex + 1}단계`}>
        {steps.map((item, index) => <i className={index <= stepIndex ? "active" : ""} key={item.selector} />)}
      </div>
      <span className="dialog-kicker">{step.eyebrow}</span>
      <h2 id="help-tour-title">{step.title}</h2>
      <p id="help-tour-copy" aria-live="polite">{step.copy}</p>
      <small>강조된 테두리가 현재 설명하는 영역을 표시합니다.</small>
      <div className="help-tour-actions">
        <button type="button" onClick={previousStep} disabled={stepIndex === 0}>이전</button>
        <button type="button" className="primary" onClick={nextStep}>{stepIndex === steps.length - 1 ? "투어 마치기" : "다음 영역"}</button>
      </div>
    </div>
  </> : null;

  return <>
    <button className="help-button" type="button" onClick={startTour} ref={triggerRef}>도움말 <span>?</span></button>
    {tourLayer && typeof document !== "undefined" ? createPortal(tourLayer, document.body) : null}
  </>;
}

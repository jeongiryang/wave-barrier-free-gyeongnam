"use client";

import { useEffect, useRef, useState } from "react";
import { speechErrorMessage } from "../../../lib/speech-capture.js";
import { useSpeechCapture } from "../hooks/useSpeechCapture";

const PRIVACY_NOTICE = "말소리를 글자로 바꾸는 기능은 브라우저가 처리해요. 브라우저에 따라 음성이 브라우저 제조사 서버로 전송될 수 있어요. W.A.V.E 서버로는 보내지 않아요.";

export default function SpeechCapturePanel({ en, onClose }: { en: boolean; onClose: () => void }) {
  const say = (ko: string, english: string) => en ? english : ko;
  const { state, start, stop, clear, reset } = useSpeechCapture();
  const [acknowledged, setAcknowledged] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, [acknowledged]);

  function close() {
    reset();
    setAcknowledged(false);
    onClose();
  }

  if (!acknowledged) return <section className="speech-capture-panel" aria-labelledby="speech-capture-title">
    <p className="section-kicker">WAVE · {say("현장 음성 글자 표시", "LIVE SPEECH TEXT")}</p>
    <h2 id="speech-capture-title" ref={titleRef} tabIndex={-1}>{say("마이크를 켜기 전에 확인해 주세요", "Before turning on the microphone")}</h2>
    <p className="speech-capture-disclosure">{PRIVACY_NOTICE}</p>
    <p>{say("확인은 저장하지 않으며, 이 화면을 열 때마다 다시 안내해요.", "Your confirmation is not saved. We show this notice every time.")}</p>
    <div className="speech-capture-actions">
      <button type="button" className="communication-primary" onClick={() => { setAcknowledged(true); requestAnimationFrame(start); }}>{say("시작하기", "Start")}</button>
      <button type="button" onClick={close}>{say("취소", "Cancel")}</button>
    </div>
  </section>;

  const errorMessage = state.error ? speechErrorMessage(state.error) : "";
  const permissionDenied = state.error === "permission-denied";
  return <section className="speech-capture-panel" aria-labelledby="speech-capture-title">
    <header>
      <div>
        <p className="section-kicker">WAVE · {say("현장 음성 글자 표시", "LIVE SPEECH TEXT")}</p>
        <h2 id="speech-capture-title" ref={titleRef} tabIndex={-1}>{say("말한 내용을 글자로 보기", "Show speech as text")}</h2>
      </div>
      <div className="speech-capture-state" data-listening={state.listening} role="status">
        <span aria-hidden="true" />{state.listening ? say("듣는 중", "Listening") : say("멈춤", "Stopped")}
      </div>
    </header>
    <p className="speech-capture-warning">{say("잘못 알아들을 수 있어요. 중요한 내용은 다시 확인해 주세요.", "Speech may be recognized incorrectly. Check important details again.")}</p>
    <div className="speech-capture-result" aria-live="polite" aria-atomic="false">
      {state.finalText ? <p className="speech-capture-final"><span>{say("확정된 문장", "Confirmed")}</span>{state.finalText}</p> : null}
      {state.interimText ? <p className="speech-capture-interim"><span>{say("인식 중", "Recognizing")}</span>{state.interimText}</p> : null}
      {!state.finalText && !state.interimText ? <p className="speech-capture-empty">{say("말한 내용이 여기에 표시돼요.", "Spoken words will appear here.")}</p> : null}
    </div>
    {errorMessage ? <p className="speech-capture-error" role="alert">{errorMessage}{permissionDenied ? ` ${say("직접 입력을 이용해 주세요.", "Please use direct input instead.")}` : ""}</p> : null}
    <div className="speech-capture-actions">
      {state.listening ? <button type="button" onClick={stop}>{say("멈추기", "Stop")}</button> : <button type="button" disabled={permissionDenied} onClick={start}>{say("다시 듣기", "Listen again")}</button>}
      <button type="button" onClick={clear}>{say("지우기", "Clear")}</button>
      <button type="button" onClick={close}>{say("닫기", "Close")}</button>
    </div>
  </section>;
}

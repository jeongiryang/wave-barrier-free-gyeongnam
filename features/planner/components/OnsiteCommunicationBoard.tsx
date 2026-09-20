"use client";

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSitePreferences } from '../../preferences/context';
import { vibrate } from '../../../lib/haptics.js';
import {
  communicationAnswers,
  communicationAnswerText,
  communicationQuestion,
  communicationQuestions,
  communicationTopics,
  MAX_CUSTOM_ANSWER_LENGTH,
  normalizeCustomAnswer,
  type CommunicationAnswer,
  type CommunicationTopic,
  type LocalCommunicationSession,
} from "../../../lib/onsite-communication.js";
import { speechCaptureSupported } from "../../../lib/speech-capture.js";

const RELAY_CENTER_URL = "https://mail.relaycall.or.kr/user/main";
const SpeechCapturePanel = lazy(() => import("./SpeechCapturePanel"));
const subscribeToSpeechSupport = (notify: () => void) => {
  queueMicrotask(notify);
  return () => {};
};

export default function OnsiteCommunicationBoard({ initialTopic, en, onEnd, onClose }: { initialTopic: CommunicationTopic; en: boolean; onEnd: () => void; onClose: () => void }) {
  const { haptics } = useSitePreferences();
  const say = (ko: string, english: string) => en ? english : ko;
  const [session, setSession] = useState<LocalCommunicationSession>(() => ({ topic: initialTopic, question: communicationQuestion(initialTopic, en) }));
  const [stage, setStage] = useState<"question" | "staff" | "answer">("question");
  const [rotated, setRotated] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [notice, setNotice] = useState(() => say("질문을 확인해 주세요.", "Please check the question."));
  const [speechCaptureOpen, setSpeechCaptureOpen] = useState(false);
  const speechCaptureAvailable = useSyncExternalStore(subscribeToSpeechSupport, speechCaptureSupported, () => false);
  const showButton = useRef<HTMLButtonElement>(null);
  const answerTitle = useRef<HTMLHeadingElement>(null);
  const speechCaptureTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => { showButton.current?.focus(); }, []);
  useEffect(() => { if (stage === "answer") answerTitle.current?.focus(); }, [stage]);

  function chooseTopic(topic: CommunicationTopic) {
    setSession({ topic, question: communicationQuestion(topic, en) });
    setNotice(say("질문을 확인해 주세요.", "Please check the question."));
  }
  function chooseQuestion(question: string) {
    setSession(current => ({ ...current, question }));
    setNotice(say("질문을 확인해 주세요.", "Please check the question."));
  }
  function chooseAnswer(answer: Exclude<CommunicationAnswer, "custom">) {
    setSession(current => ({ ...current, answer }));
    setStage("answer");
    setNotice(say("직원이 고른 답이에요.", "This is the staff member's answer."));
    vibrate('confirm', haptics === 'on');
  }
  function confirmCustom() {
    const customAnswer = normalizeCustomAnswer(customDraft);
    if (!customAnswer) { setNotice(say("답변을 입력하거나 취소해 주세요.", "Type an answer or cancel.")); return; }
    setSession(current => ({ ...current, answer: "custom", customAnswer }));
    setStage("answer"); setCustomOpen(false); setNotice(say("직원이 고른 답이에요.", "This is the staff member's answer."));
    vibrate('confirm', haptics === 'on');
  }
  function askAgain() {
    setSession(current => ({ topic: current.topic, question: current.question }));
    setCustomDraft(""); setCustomOpen(false); setStage("question"); setNotice(say("질문을 확인해 주세요.", "Please check the question."));
    requestAnimationFrame(() => showButton.current?.focus());
  }
  function end() {
    setSession({ topic: initialTopic, question: "" });
    setCustomDraft(""); setNotice(say("대화 내용을 지웠어요.", "The conversation was erased.")); onEnd();
  }
  const answerText = session.answer === "custom" ? session.customAnswer || "" : session.answer ? communicationAnswerText(session.answer, en) : "";
  const step = stage === "question" ? 1 : stage === "staff" ? 2 : 3;

  if (speechCaptureOpen) return <Suspense fallback={<p role="status">{say("음성 글자 화면을 준비하고 있어요…", "Preparing live speech text…")}</p>}>
    <SpeechCapturePanel en={en} onClose={() => { setSpeechCaptureOpen(false); requestAnimationFrame(() => speechCaptureTrigger.current?.focus()); }} />
  </Suspense>;

  return <div className="onsite-communication" data-stage={stage}>
    <header><div><p className="section-kicker">WAVE · 현장 의사소통</p>
    <h2 id="inquiry-title" tabIndex={-1} ref={stage === "answer" ? answerTitle : undefined}>{stage === "question" ? say("직원과 화면으로 대화", "Talk with staff on screen") : stage === "staff" ? say("답을 골라 주세요", "Choose an answer") : say("직원이 고른 답이에요", "The staff member chose this answer")}</h2></div><button type="button" onClick={onClose} aria-label={say("현장 의사소통판 닫기", "Close onsite communication board")}>×</button></header>
    <p>{stage === "question" ? say("질문을 보여주고 직원의 답을 화면으로 받아요.", "Show your question and receive the staff member's answer on screen.") : stage === "staff" ? say("화면에서 알맞은 답을 골라 주세요.", "Choose the best answer on screen.") : say("선택한 답을 확인해 주세요.", "Please check the selected answer.")}</p>
    <ol className="communication-steps" aria-label="대화 단계">
      {(en ? ["Question", "Staff answer", "Check"] : ["질문", "직원 답변", "확인"]).map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}>{index + 1} {label}</li>)}
    </ol>

    {stage === "question" && <>
      <div className="communication-topics" role="group" aria-label="질문 주제">
        {communicationTopics.map(topic => <button type="button" key={topic.id} aria-pressed={session.topic === topic.id} onClick={() => chooseTopic(topic.id)}>{en ? topic.questionEn : topic.label}</button>)}
      </div>
      {communicationQuestions(session.topic, en).length > 1 && <div className="communication-topics" role="group" aria-label={say("질문 문장", "Question wording")}>
        {communicationQuestions(session.topic, en).map(question => <button type="button" key={question} aria-pressed={session.question === question} onClick={() => chooseQuestion(question)}>{question}</button>)}
      </div>}
      <div className="inquiry-card-preview"><p>{session.question}</p></div>
      <button className="communication-primary" ref={showButton} type="button" onClick={() => { setStage("staff"); setNotice(say("답을 골라 주세요.", "Please choose an answer.")); }}>{say("직원에게 보여주기", "Show to staff")}</button>
    </>}

    {stage === "staff" && <div className={`communication-staff-board${rotated ? " is-rotated" : ""}`}>
      <div className="inquiry-card-preview"><p>{session.question}</p></div>
      {!customOpen ? <>
        <div className="communication-answer-grid" aria-label="직원 답변">
          {communicationAnswers.map(answer => <button type="button" key={answer.id} onClick={() => chooseAnswer(answer.id)}>{en ? answer.labelEn : answer.label}</button>)}
        </div>
        <button type="button" className="communication-direct" onClick={() => { setCustomOpen(true); setNotice(say("답변을 입력해 주세요.", "Please type an answer.")); }}>{say("직접 입력", "Type an answer")}</button>
        {speechCaptureAvailable && <button ref={speechCaptureTrigger} type="button" className="communication-speech-capture" onClick={() => setSpeechCaptureOpen(true)}>{say("말한 내용을 글자로 보기", "Show speech as text")}</button>}
      </> : <div className="communication-custom">
        <label htmlFor="communication-custom-answer">{say("직접 입력", "Type an answer")}</label>
        <textarea id="communication-custom-answer" autoFocus rows={4} maxLength={MAX_CUSTOM_ANSWER_LENGTH} value={customDraft} onChange={event => { setCustomDraft(event.target.value); setNotice(""); }} />
        <small>{customDraft.length}/{MAX_CUSTOM_ANSWER_LENGTH}</small>
        <div><button type="button" onClick={() => { setCustomOpen(false); setCustomDraft(""); setNotice(say("답을 골라 주세요.", "Please choose an answer.")); }}>{say("취소", "Cancel")}</button><button className="communication-primary" type="button" onClick={confirmCustom}>{say("답변 확정", "Confirm answer")}</button></div>
      </div>}
    </div>}

    {stage === "answer" && <div className="inquiry-card-preview communication-answer" aria-live="assertive"><p>{answerText}</p></div>}
    <p className="communication-notice" role="status">{notice}</p>
    <div className="communication-secondary-actions">
      {stage !== "answer" && <button type="button" aria-pressed={rotated} onClick={() => setRotated(value => !value)}>{say("화면 돌리기", "Rotate screen")}</button>}
      <a href={RELAY_CENTER_URL} target="_blank" rel="noopener noreferrer">{say("문자·수어 통화 도움", "Text or sign-language call help")}</a>
      {stage === "answer" && <button type="button" onClick={askAgain}>{say("다시 질문", "Ask again")}</button>}
      <button type="button" className="communication-end" onClick={end}>{say("대화 끝내기", "End conversation")}</button>
    </div>
  </div>;
}

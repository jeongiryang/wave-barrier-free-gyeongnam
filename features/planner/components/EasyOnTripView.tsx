"use client";
import { useEffect, useRef, useState } from 'react';
import type { EasyTripStep } from '../../../lib/on-trip.js';

type Props = {
  steps: EasyTripStep[];
  done: number;
  skipped: number;
  fixedCurrent: boolean;
  ready: boolean;
  canUndo: boolean;
  notice: string;
  onDone: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onBasicView: () => void;
};

export default function EasyOnTripView(props: Props) {
  const [resting, setResting] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [speechNotice, setSpeechNotice] = useState('');
  const currentTitle = useRef<HTMLHeadingElement>(null);
  const current = props.steps[0];
  useEffect(() => { currentTitle.current?.focus({ preventScroll: true }); }, [current?.itineraryStopId]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);

  if (!current) return <section className="easy-on-trip" aria-labelledby="easy-trip-finished">
    {props.done + props.skipped === 0 ? <><h2 id="easy-trip-finished">오늘 할 일</h2><p>오늘 일정에 담긴 장소가 없어요.</p><a className="easy-trip-link" href="#places">여행지 추가하기</a></> : <><h2 id="easy-trip-finished">오늘 일정이 끝났어요</h2><p>{props.done}곳을 다녀왔고 {props.skipped}곳을 건너뛰었어요.</p>{props.canUndo && <button type="button" className="easy-trip-secondary" onClick={props.onUndo}>되돌리기</button>}<button type="button" className="easy-trip-secondary" onClick={props.onBasicView}>기본 보기</button></>}
    <p role="status">{props.notice}</p>
  </section>;

  const readCurrent = () => {
    currentTitle.current?.focus({ preventScroll: true });
    if (!('speechSynthesis' in window)) { setSpeechNotice('이 브라우저는 읽어주기를 지원하지 않아요. 화면의 같은 내용을 확인해 주세요.'); return; }
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance([current.title, current.scheduledTime, current.instruction].filter(Boolean).join('. '));
    speech.lang = 'ko-KR'; speech.onerror = () => setSpeechNotice('읽어주기를 마치지 못했어요. 화면의 같은 내용을 확인해 주세요.');
    window.speechSynthesis.speak(speech); setSpeechNotice('지금 할 일을 다시 읽고 있어요.');
  };

  return <section className="easy-on-trip" aria-labelledby="easy-trip-title">
    <h2 id="easy-trip-title">오늘 할 일</h2>
    {resting && <aside className="easy-trip-rest" aria-labelledby="easy-trip-rest-title"><h3 id="easy-trip-rest-title">잠시 쉬는 중</h3><button type="button" className="easy-trip-primary" onClick={() => setResting(false)}>계속하기</button></aside>}
    <div className="easy-trip-list">
      {props.steps.map((step, index) => <article key={step.id} className={index === 0 ? 'easy-trip-card current' : 'easy-trip-card'}>
        <small>{index === 0 ? '지금' : index === 1 ? '다음' : '그다음'}</small>
        <h3 ref={index === 0 ? currentTitle : undefined} tabIndex={index === 0 ? -1 : undefined} aria-current={index === 0 ? 'step' : undefined}>{step.title}</h3>
        {step.scheduledTime && <time>{step.scheduledTime}</time>}
        <p>{step.instruction}</p>
        {index === 0 && <div className="easy-trip-actions">
          <button type="button" className="easy-trip-primary" disabled={resting || !props.ready} onClick={props.onDone}>다녀왔어요</button>
          <button type="button" className="easy-trip-secondary" disabled={resting || !props.ready} onClick={readCurrent}>다시 듣기</button>
          <button type="button" className="easy-trip-secondary" disabled={resting || !props.ready} onClick={() => { setConfirmSkip(false); setResting(true); }}>잠깐 쉬기</button>
          {!props.fixedCurrent && !confirmSkip && <button type="button" className="easy-trip-secondary" disabled={resting || !props.ready} onClick={() => setConfirmSkip(true)}>이번 장소 건너뛰기</button>}
          {confirmSkip && <div className="easy-trip-confirm" role="group" aria-label="장소 건너뛰기 확인"><p>{step.title}을 건너뛸까요? 완료한 장소로 표시하지 않아요.</p><button type="button" className="easy-trip-secondary" onClick={() => { setConfirmSkip(false); props.onSkip(); }}>이번 장소 건너뛰기</button><button type="button" className="easy-trip-secondary" onClick={() => setConfirmSkip(false)}>취소</button></div>}
        </div>}
      </article>)}
    </div>
    {props.canUndo && <button type="button" className="easy-trip-secondary" onClick={props.onUndo}>되돌리기</button>}
    <p role="status">{speechNotice || props.notice}</p>
  </section>;
}

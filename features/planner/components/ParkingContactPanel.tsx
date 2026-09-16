'use client';
import { useMemo, useRef, useState } from 'react';
import { buildParkingContactQuestion, createParkingTelHref, isKakaoRelayOpen } from '../../../lib/parking-contact.js';

const KAKAO_RELAY_URL = 'https://pf.kakao.com/_LBXwxj/chat';
const WEB_RELAY_URL = 'https://relaycall.or.kr/user/service/text/text';
const KAKAO_RELAY_OPEN = isKakaoRelayOpen(Date.now());

type ParkingContactPanelProps = {
  id: string;
  parkingName: string;
  phoneNumber?: string;
  placeName?: string;
  onClose: () => void;
};

export default function ParkingContactPanel({ id, parkingName, phoneNumber, placeName, onClose }: ParkingContactPanelProps) {
  const telHref = useMemo(() => createParkingTelHref(phoneNumber), [phoneNumber]);
  const question = useMemo(() => buildParkingContactQuestion({ parkingName, phoneNumber: phoneNumber || '', placeName }), [parkingName, phoneNumber, placeName]);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const textarea = useRef<HTMLTextAreaElement>(null);

  const selectQuestion = () => {
    textarea.current?.focus();
    textarea.current?.setSelectionRange(0, question?.length || 0);
  };

  const copyQuestion = async () => {
    if (!question) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(question);
      setCopyState('copied');
    } catch {
      setCopyState('manual');
      requestAnimationFrame(selectQuestion);
    }
  };

  return <section id={id} className="parking-contact-panel" aria-labelledby={`${id}-title`} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
  }}>
    <h6 id={`${id}-title`}>주차하기 전에 확인해 보세요</h6>
    <p>공식 정보에는 실시간 빈자리가 포함되지 않아요.<br />표시된 번호가 현장 주차장이 아닌 관리기관 번호일 수 있어요.</p>
    <p>담당자가 현재 상황을 바로 확인하지 못할 수도 있으니,<br />출발하기 전에 직접 문의해 보세요.</p>
    {telHref && question ? <>
      <h6>어떤 방법이 편한가요?</h6>
      <div className="parking-actions"><a href={telHref}>전화 앱 열기</a></div>
      <p>휴대전화의 기본 전화 앱에서 직접 통화해요.<br />통화 시작은 전화 앱에서 결정할 수 있어요.</p>
      <h6>음성 통화가 어려운 경우</h6>
      <p>질문을 문자로 보내면 중계사가 주차장에 대신 전화하고,<br />주차장의 답변을 문자로 전달해 드려요.</p>
      <p>주차장에서는 별도 앱 없이 일반 전화를 받으면 돼요.</p>
      <ol><li>아래에서 질문을 복사합니다.</li><li>카카오톡 또는 107 웹 문자중계를 엽니다.</li><li>문자중계 채팅창에 복사한 내용을 붙여 넣습니다.</li></ol>
      <div className="parking-actions parking-contact-actions">
        <button type="button" onClick={() => void copyQuestion()}>질문 복사하기</button>
        <a href={KAKAO_RELAY_URL} target="_blank" rel="noopener noreferrer">카카오톡 문자중계 열기</a>
        <a href={WEB_RELAY_URL} target="_blank" rel="noopener noreferrer">107 웹 문자중계 열기</a>
      </div>
      <p>휴대폰에 카카오톡이 있으면 앱으로 연결해요.<br />앱을 열 수 없으면 카카오톡 채널 웹페이지가 열려요.</p>
      <p>{KAKAO_RELAY_OPEN ? <>매일 08:00~24:00 이용할 수 있어요.<br />중계사 연결을 기다릴 수 있어요.</> : <>현재 공식 이용시간 밖이에요.<br />지금은 107 웹 문자중계를 이용해 주세요.</>}</p>
      <p>휴대폰과 컴퓨터의 웹브라우저에서 이용할 수 있어요.<br />회원가입과 로그인이 필요해요.<br />중계사 연결을 기다릴 수 있어요.</p>
      {copyState === 'copied' && <p role="status">질문을 복사했어요. 문자중계 채팅창에 붙여 넣어 주세요.</p>}
      {copyState === 'manual' && <div className="parking-manual-copy">
        <p role="status">자동으로 복사하지 못했어요.<br />아래 내용을 전체 선택해 복사해 주세요.</p>
        <label htmlFor={`${id}-question`}>직접 복사할 질문</label>
        <textarea id={`${id}-question`} ref={textarea} readOnly rows={9} value={question} />
        <button type="button" onClick={selectQuestion}>전체 선택</button>
      </div>}
    </> : <p>문의 가능한 전화번호가 없어요.</p>}
    <div className="parking-actions parking-contact-close"><button type="button" aria-label="주차장 문의 닫기" onClick={onClose}>닫기</button></div>
  </section>;
}

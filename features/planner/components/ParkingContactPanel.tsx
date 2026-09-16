'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildParkingContactContent, isKakaoRelayOpen } from '../../../lib/parking-contact.js';

const KAKAO_RELAY_URL = 'https://pf.kakao.com/_LBXwxj';
const WEB_RELAY_URL = 'https://relaycall.or.kr/user/service/text/text';

type Props = { parkingName: string; phoneNumber?: string; placeName?: string; panelId: string; onClose: () => void };

export default function ParkingContactPanel({ parkingName, phoneNumber, placeName, panelId, onClose }: Props) {
  const content = useMemo(() => buildParkingContactContent({ parkingName, phoneNumber, placeName }), [parkingName, phoneNumber, placeName]);
  const [notice, setNotice] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const fallback = useRef<HTMLTextAreaElement>(null);
  const kakaoOpen = isKakaoRelayOpen();

  useEffect(() => { if (manualCopy) fallback.current?.focus(); }, [manualCopy]);

  const copyInquiry = async () => {
    setNotice('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content.inquiryText);
      setManualCopy(false);
      setNotice('질문을 복사했어요. 문자중계 채팅창에 붙여 넣어 주세요.');
    } catch {
      setManualCopy(true);
      setNotice('자동으로 복사하지 못했어요. 아래 내용을 선택해 직접 복사해 주세요.');
    }
  };

  return <section id={panelId} className="parking-contact-panel" style={{ marginTop: 16, padding: 18, border: '1px solid var(--line)', borderRadius: 16, background: 'var(--paper)' }} aria-labelledby={`${panelId}-title`} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } }}>
    <header><h6 id={`${panelId}-title`}>주차하기 전에 확인해 보세요</h6><p>공식 정보에는 실시간 빈자리가 포함되지 않아요. 전화번호가 현장 주차장이 아닌 관리기관 번호일 수 있어요.</p><div className="parking-actions"><button type="button" aria-label="주차장 문의 닫기" onClick={onClose}>닫기</button></div></header>
    <p><strong>어떤 방법이 편한가요?</strong></p>
    <div className="parking-actions">{content.phoneNumber ? <a href={`tel:${content.phoneNumber}`}>전화 앱 열기</a> : <p>문의 가능한 전화번호가 없어요.</p>}</div>
    <section aria-labelledby={`${panelId}-relay-title`}>
      <h6 id={`${panelId}-relay-title`}>음성 통화가 어려운 경우</h6>
      <p>질문을 문자로 보내면 중계사가 주차장에 대신 전화하고, 답변을 문자로 전달해 드려요. 주차장에서는 일반 전화를 받으면 돼요.</p>
      <div className="parking-actions"><button type="button" onClick={() => void copyInquiry()}>질문 복사하기</button></div>
      {notice && <p role="status">{notice}</p>}
      {manualCopy && <label style={{ display: 'grid', gap: 8, marginTop: 12 }}>직접 복사할 질문<textarea style={{ width: '100%', minWidth: 0, padding: 12, font: 'inherit' }} ref={fallback} readOnly rows={9} value={content.inquiryText} onFocus={event => event.currentTarget.select()} /></label>}
      <div>
        <div><strong>카카오톡 손말이음센터</strong><p>매일 08:00~24:00 이용할 수 있어요. 채팅에서 문자중계를 요청한 뒤 복사한 질문을 붙여 넣어 주세요.</p>{!kakaoOpen && <p><strong>지금은 공식 이용시간 밖이에요. 107 웹 문자중계를 이용해 주세요.</strong></p>}<div className="parking-actions"><a href={KAKAO_RELAY_URL} target="_blank" rel="noopener noreferrer">카카오톡 문자중계 열기</a></div></div>
        <div><strong>107 웹 문자중계</strong><p>24시간 이용 안내가 있지만 회원가입과 로그인이 필요해요. 중계사 연결을 기다릴 수 있어요.</p><div className="parking-actions"><a href={WEB_RELAY_URL} target="_blank" rel="noopener noreferrer">107 웹 문자중계 열기</a></div></div>
      </div>
    </section>
  </section>;
}

'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import NightIcon from './NightIcon';

export default function NightBanner({ kind }: { kind: 'community' | 'festival' }) {
  const festival = kind === 'festival';
  const note = festival ? '경남의 밤이\n더 특별해지는 순간' : '좋은 여행은\n누구에게나 열려 있어요';
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let active = true;
    document.fonts.load('400 32px WaveHand', note).then(() => { if (active) setFontReady(true); }).catch(() => { if (active) setFontReady(true); });
    return () => { active = false; };
  }, [note]);
  const benefits = festival
    ? [['access', '누구나 즐기는 축제', '함께 떠나는 경남 여행'], ['pin', '편리한 축제 정보', '개최 기간과 장소 확인'], ['map', '주변 여행지와 함께', '축제가 있는 특별한 여행'], ['people', '지금, 경남의 축제', '계절마다 새로운 즐거움']]
    : [['people', '함께 만드는', '배리어프리 여행'], ['chat', '실제 여행자의', '생생한 후기'], ['shield', '여행 준비에 필요한', '관광·편의 정보'], ['heart', '경남을 더 가깝게', '연결하는 사람들']];
  return <section className="night-banner" aria-label={festival ? '경남 축제 소개' : 'WAVE 커뮤니티 소개'}>
    <div className="night-banner-copy"><h1><span className="night-banner-desktop-copy">{festival ? <>함께여서 더 특별한,<br/><em>경남의 축제</em>를 만나보세요</> : <>여행의 모든 이야기가 모이는 곳,<br/><em>WAVE 커뮤니티</em></>}</span><span className="night-banner-mobile-copy">{festival ? <>경남의 축제,<br/><em>더 특별한 순간들</em></> : <>여행이<br/>사람을 연결해요.</>}</span></h1><p>{festival ? <>누구나 즐길 수 있는, 모두를 위한 축제 여행<br/>WAVE와 함께 경남의 특별한 순간을 경험하세요.</> : <>경남을 여행하는 모두의 경험, 질문, 그리고 따뜻한 이야기를 함께 나눠요.<br/>당신의 경험이 누군가의 특별한 여행이 됩니다.</>}</p>
      <div className="night-benefits">{benefits.map(([icon, title, description]) => <div key={title}><NightIcon name={icon} size={30}/><span><strong>{title}</strong><small>{description}</small></span></div>)}</div>
    </div>
    <div className="night-banner-note" data-font-ready={fontReady}><span className="sr-only">{note.replace('\n', ' ')}</span><span aria-hidden="true">{Array.from(note).map((character, i) => character === '\n' ? <br key={i} /> : <span className="banner-written-character" key={i} style={{ '--letter-delay': `${i * 110 + 350}ms` } as CSSProperties}>{character}</span>)}</span></div>
  </section>;
}

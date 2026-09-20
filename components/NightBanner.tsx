'use client';
import { useState } from 'react';
import NightIcon from './NightIcon';

export default function NightBanner({ kind }: { kind: 'community' | 'festival' }) {
  const [slide, setSlide] = useState(0);
  const festival = kind === 'festival';
  const photos = festival ? ['festival', 'garden', 'coast'] : ['community', 'coast', 'garden'];
  const benefits = festival
    ? [['access', '누구나 즐기는 축제', '함께 떠나는 경남 여행'], ['pin', '편리한 축제 정보', '개최 기간과 장소 확인'], ['map', '주변 여행지와 함께', '축제가 있는 특별한 여행'], ['people', '지금, 경남의 축제', '계절마다 새로운 즐거움']]
    : [['people', '함께 만드는', '배리어프리 여행'], ['chat', '실제 여행자의', '생생한 후기'], ['shield', '여행 준비에 필요한', '관광·편의 정보'], ['heart', '경남을 더 가깝게', '연결하는 사람들']];
  return <section className="night-banner" aria-label={festival ? '경남 축제 소개' : 'WAVE 커뮤니티 소개'}>
    {photos.map((photo, index) => <img key={photo} className="night-banner-photo" data-active={slide === index} src={`/media/night/${photo}.webp`} alt="" aria-hidden="true" fetchPriority={index === 0 ? 'high' : 'low'} />)}
    <div className="night-banner-shade"/>
    <div className="night-banner-copy"><h1>{festival ? <>함께여서 더 특별한,<br/><em>경남의 축제</em>를 만나보세요</> : <>여행의 모든 이야기가 모이는 곳,<br/><em>WAVE 커뮤니티</em></>}</h1><p>{festival ? <>누구나 즐길 수 있는, 모두를 위한 축제 여행<br/>WAVE와 함께 경남의 특별한 순간을 경험하세요.</> : <>경남을 여행하는 모두의 경험, 질문, 그리고 따뜻한 이야기를 함께 나눠요.<br/>당신의 경험이 누군가의 특별한 여행이 됩니다.</>}</p>
      <div className="night-benefits">{benefits.map(([icon, title, description]) => <div key={title}><NightIcon name={icon} size={30}/><span><strong>{title}</strong><small>{description}</small></span></div>)}</div>
    </div>
    <div className="night-banner-note">{festival ? <>경남의 밤이<br/>더 특별해지는 순간</> : <>좋은 여행은<br/>누구에게나 열려 있어요</>}</div>
    <div className="night-banner-controls"><span aria-live="polite">{String(slide + 1).padStart(2, '0')} <i>/ 03</i></span><button aria-label="이전 배너" onClick={() => setSlide((slide + 2) % 3)}>‹</button><button aria-label="다음 배너" onClick={() => setSlide((slide + 1) % 3)}>›</button></div>
  </section>;
}

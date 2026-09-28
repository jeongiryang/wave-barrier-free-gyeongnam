"use client";
import { lazy, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import NightIcon from '../../../components/NightIcon';
import { regionShowcasePhotos } from '../region-showcase-photos';
const JourneyPaperMap = lazy(() => import('./JourneyPaperMap'));
import usePreviewPlayback from './usePreviewPlayback';

const regions = ['통영', '거제', '하동', ...Object.keys(regionShowcasePhotos).filter(name => !['통영', '거제', '하동'].includes(name))];
const steps = ['여행지 고르기', '일정에 담기', '지도에서 확인'];
const icons = ['pin', 'plus', 'map'];

export default function LandingJourneyPreview({ en }: { en: boolean }) {
  const { ref, ready, frame, paused, reduced, select } = usePreviewPlayback(regions.length, 4000, false);
  const [stage, setStage] = useState(0);
  const region = regions[frame], photo = regionShowcasePhotos[region];
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduced) { node.style.setProperty('--journey-progress', '0'); return; }
    if (paused) return;
    let raf = 0;
    const move = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const top = node.getBoundingClientRect().top;
        const progress = Math.max(0, Math.min(1, (innerHeight * .65 - top) / (innerHeight * .65)));
        node.style.setProperty('--journey-progress', String(progress));
      });
    };
    move(); window.addEventListener('scroll', move, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', move); };
  }, [ref, paused, reduced]);
  const choose = (index: number) => { select(index); setStage(0); };
  return <div className="wave-journey-demo" ref={ref} data-stage={stage} data-region={region} data-reduced={reduced} aria-label="여행 설계 미리보기">
    <header><h2>{en ? 'Places become your journey' : '마음에 든 풍경을, 내 여행으로'}</h2></header>
    <div className="journey-demo-steps" aria-label="여행 예시 단계">{steps.map((label,i)=><span key={label}><NightIcon name={icons[i]} size={18}/>{label}</span>)}</div>
    <div className="journey-demo-grid">
      <div className="journey-map-preview">
        <div className="journey-artboard">
          <img className="journey-art" src="/naru/journey-preview-v3.webp" alt="밤 항구에서 경남 여행 지도를 가리키는 나루와 꼬마 여행자" width="1536" height="1024" loading="lazy"/>
          {ready && <Suspense fallback={null}><JourneyPaperMap region={region}/></Suspense>}
        </div>
      </div>
      <div className="journey-destination">
        <Link className="journey-photo-link" href={`/planner?region=${encodeURIComponent(region)}`} aria-label={`${region} 여행 만들기`}><img key={region} className="journey-place-photo" src={photo.image} alt={photo.title} width="800" height="600" loading="lazy"/></Link>
        <div className="journey-place-copy"><div><span>{region}</span><h3>{photo.title}</h3></div></div>
      </div>
    </div>
    <div className="journey-region-tabs" aria-label="예시 여행 지역">{regions.map((name,i)=><button type="button" disabled={!ready} key={name} aria-pressed={name===region} onClick={()=>choose(i)}>{name}</button>)}</div>
  </div>;
}

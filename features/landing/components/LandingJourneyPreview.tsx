"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import NightIcon from '../../../components/NightIcon';
import { regionShowcasePhotos } from '../region-showcase-photos';
import { regionBoundaries } from '../region-boundaries';
import usePreviewPlayback from './usePreviewPlayback';
import './landing-previews.css';

const regions = ['통영', '거제', '하동', ...Object.keys(regionShowcasePhotos).filter(name => !['통영', '거제', '하동'].includes(name))];
const steps = ['여행지 고르기', '일정에 담기', '지도에서 확인'];
const icons = ['pin', 'plus', 'map'];

export default function LandingJourneyPreview({ en }: { en: boolean }) {
  const { ref, ready, frame, paused, reduced, toggle, select } = usePreviewPlayback(regions.length, 4000, false);
  const [stage, setStage] = useState(0);
  const region = regions[frame], photo = regionShowcasePhotos[region];
  const point = regionBoundaries.find(area => area.name === region)!;
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
  const advance = (next: number) => { select(frame); setStage(next); };
  return <div className="wave-journey-demo" ref={ref} data-stage={stage} data-region={region} data-reduced={reduced} aria-label="여행 설계 미리보기">
    <header><h2>{en ? 'Places become your journey' : '마음에 든 풍경을, 내 여행으로'}</h2>{!reduced && <button type="button" disabled={!ready} onClick={toggle} data-icon-action="" title={paused ? '재생' : '일시정지'} aria-label={paused ? '여행 예시 재생' : '여행 예시 일시정지'}><NightIcon name={paused ? 'play' : 'pause'} size={20}/></button>}</header>
    <div className="journey-demo-steps" aria-label="여행 예시 단계">{steps.map((label,i)=><span key={label}><NightIcon name={icons[i]} size={18}/>{label}</span>)}</div>
    <div className="journey-demo-grid">
      <div className="journey-map-preview">
        <div className="journey-artboard">
          <img className="journey-art" src="/naru/journey-preview-v3.webp" alt="밤 항구에서 경남 여행 지도를 가리키는 나루와 꼬마 여행자" width="1536" height="1024" loading="lazy"/>
          <svg className="journey-paper-map" viewBox="0 0 1536 1024" role="img" aria-label={`나루와 꼬마 여행자가 가리키는 지도: ${region}`}>
            {/* Project the live map onto the illustrated paper, below their hands. */}
            <g transform="matrix(.78 0 -.08 .245 480 762)">
              {regionBoundaries.map((area,i)=><path key={area.name} d={area.path} fillRule="evenodd" data-tone={i%4} data-featured={area.name===region}/>) }
            </g>
            <path className="journey-map-waves" d="M540 931q8-5 16 0t16 0m45 12q8-5 16 0t16 0m133-5q8-5 16 0t16 0m30-18q8-5 16 0t16 0"/>
            <g className="journey-map-labels">{regionBoundaries.filter(area=>area.name!==region).map(area=><g key={area.name} transform={`translate(${480+area.x*.78-area.y*.08} ${762+area.y*.245})`}><ellipse rx="3" ry="1.7"/><text x="0" y="-5" textAnchor="middle">{area.name}</text></g>)}</g>
            <g key={region} transform={`translate(${480 + point.x * .78 - point.y * .08} ${762 + point.y * .245}) scale(.82)`}>
              <g className="journey-marker-lift"><path className="journey-pin-face" d="M0 0C-7-12-25-29-25-46a25 25 0 1 1 50 0C25-29 7-12 0 0Z"/><circle className="journey-pin-center" cx="0" cy="-46" r="9"/><rect className="journey-pin-label" x="32" y="-66" width="108" height="40" rx="12"/><text className="journey-pin-name" x="86" y="-36" textAnchor="middle">{region}</text></g>
            </g>
          </svg>
        </div>
        <button className="journey-map-zoom" type="button" data-icon-action="" disabled={!ready} aria-label={stage===2?'예시 지도 축소':'예시 지도에서 확인'} title={stage===2?'지도 축소':'지도 확대'} onClick={()=>advance(stage===2?0:2)}><NightIcon name={stage===2?'close':'search'} size={20}/></button>
      </div>
      <div className="journey-destination">
        <Link className="journey-photo-link" href={`/planner?region=${encodeURIComponent(region)}`} aria-label={`${region} 여행 만들기`}><img key={region} className="journey-place-photo" src={photo.image} alt={photo.title} width="800" height="600" loading="lazy"/></Link>
        <div className="journey-place-copy"><div><span>{region}</span><h3>{photo.title}</h3></div><button type="button" disabled={!ready} data-icon-action="" title={stage>0?'일정에 담음':'일정에 담기'} aria-label={`${photo.title} 예시 일정에 담기`} aria-pressed={stage>0} onClick={()=>advance(stage>0?0:1)}><NightIcon name={stage>0?'check':'plus'} size={20}/></button></div>
      </div>
    </div>
    <div className="journey-region-tabs" aria-label="예시 여행 지역">{regions.map((name,i)=><button type="button" disabled={!ready} key={name} aria-pressed={name===region} onClick={()=>choose(i)}>{name}</button>)}</div>
  </div>;
}

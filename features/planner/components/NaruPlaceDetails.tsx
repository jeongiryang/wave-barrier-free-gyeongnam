'use client';
import Image from 'next/image';
import NightIcon from '../../../components/NightIcon';
import { safeTourismImageUrl } from '../../tourism/image-url';
import { useSavedPlaceEvidence } from '../hooks/useSavedPlaceEvidence';
import { FACILITIES } from '../../../lib/facility-selection.js';
import PlaceVisitHours from './PlaceVisitHours';
import PlaceSensory from './PlaceSensory';
import type { Place } from '../types';

/** In-panel detail: the existing ID-based provider lookup is cancelled on close/change. */
export default function NaruPlaceDetails({ original, onClose }: { original: Place; onClose: () => void }) {
  const result = useSavedPlaceEvidence([original.id], FACILITIES.map(item => item.key), true);
  const place = result.places.find(item => item.id === original.id) || original;
  const image = safeTourismImageUrl(place.image);
  return <section className="naru-place-detail" aria-label={`${place.name} 상세정보`}>
    <header><h2>{place.name}</h2><button type="button" onClick={onClose}><NightIcon name="close" size={18}/>대화로 돌아가기</button></header>
    {image && <div className="naru-detail-photo"><Image unoptimized src={image} alt={place.name} width={640} height={360}/></div>}
    <p>{place.address || '주소 미제공'}</p><p>{place.summary || '소개 정보 미제공'}</p>
    <p role="status">{result.notice || '관광지 상세정보를 확인하고 있어요.'}</p>
    {!result.loading && !result.places.length && <button type="button" onClick={result.retry}>상세정보 다시 확인</button>}
    <PlaceVisitHours id={place.id} name={place.name}/>
    <section aria-label="장소의 편의시설"><h3>편의시설</h3><div className="naru-detail-facilities">{place.accessibility?.map(item => <article key={item.key}><h4>{item.label}</h4><strong>{item.state === 'confirmed' ? '기록 확인' : item.state === 'negative' ? '제공하지 않음으로 기록' : '미확인'}</strong><p>{item.detail || '방문 전 문의해 주세요.'}</p></article>)}</div>{!place.accessibility?.length && <p>편의정보 미확인 · 시설이 없다는 뜻은 아닙니다.</p>}</section>
    <PlaceSensory place={place}/>
    <details><summary>정보 출처</summary><p>{place.source || '출처 미제공'} · {place.checkedAt || '조회 시각 미제공'}</p></details>
  </section>;
}

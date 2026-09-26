"use client";

import { useState } from 'react';
import { AwardPhotoProvider, useAwardPhotos } from './AwardPanorama';
import { useRegionApiPhotos } from '../useRegionApiPhotos';
import { regionBoundaries } from '../region-boundaries';
import { readPhotoCredits, type ViewedPhotoCredit } from '../photo-credit-store';
import '../../../app/styles/photo-credits.css';

function LiveCredits() {
  const photos = useRegionApiPhotos(regionBoundaries.map(region => region.name), true);
  const awards = useAwardPhotos();
  const [viewed] = useState<ViewedPhotoCredit[]>(readPhotoCredits);
  const catalog = new Map(viewed.map(photo => [photo.image, photo]));
  Object.values(photos).forEach(entry => {
    if (entry.photo) catalog.set(entry.photo.image, { ...entry.photo, source: '한국관광공사 관광사진' });
  });
  awards.forEach(photo => catalog.set(photo.image, { ...photo, location: photo.address }));
  const pending = Object.keys(photos).length < regionBoundaries.length;
  return <>
    <p>이 탭에서 불러온 사진과 현재 제공되는 지역·관광공모전 사진을 함께 표시합니다. 제공 사진은 조회 시점에 따라 달라질 수 있습니다. 개별 저작자나 이용조건이 응답에 없으면 확인되지 않은 상태로 표시합니다.</p>
    <p role="status">{pending ? '지역 사진 출처를 불러오는 중입니다.' : '지역 사진 출처 조회를 마쳤습니다. 제공처 오류나 사진이 없는 지역은 목록에서 제외됩니다.'}</p>
    <ul className="photo-credits-grid">{[...catalog.values()].map(photo => <li key={photo.image}>
      <img src={photo.image} alt={photo.title} loading="lazy" width="240" height="160" />
      <div><strong>{photo.title}</strong><p>{photo.location}<br />제공: ⓒ한국관광공사 · {photo.source}<br />저작자 표기: {photo.photographer || '제공 응답에 없음'}</p><a href={photo.image} target="_blank" rel="noopener noreferrer">사진 원본 (새 탭)</a><p>개별 이용조건: 미확인. 원본 링크가 이용허락 증빙을 대신하지 않습니다.</p></div>
    </li>)}</ul>
    {!catalog.size && <p>표시할 사진 출처가 없습니다. 제공처 응답과 이 탭의 사진 기록을 사용할 수 없을 수 있습니다.</p>}
  </>;
}

export default function PhotoCredits() {
  const [open, setOpen] = useState(false);
  return <details onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>지도·지역 미리보기와 관광공모전 사진 출처 보기</summary>
    {open && <AwardPhotoProvider><LiveCredits /></AwardPhotoProvider>}
  </details>;
}

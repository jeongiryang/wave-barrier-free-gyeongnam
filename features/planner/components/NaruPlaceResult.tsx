'use client';

import { useState } from 'react';
import NightIcon from '../../../components/NightIcon';
import { safeTourismImageUrl } from '../../tourism/image-url';
import { rememberPhotoCredits } from '../../landing/photo-credit-store';
import { evidenceStateText, placeFacilityState } from '../../../lib/naru-evidence.js';
import type { Place } from '../types';
import styles from './NaruPlaceResult.module.css';

type Props = {
  place: Place;
  facilityKey: string | null;
  facilityLabel: string;
  canAdd: boolean;
  saved: boolean;
  onDetails: () => void;
  onAdd: () => void;
};

export default function NaruPlaceResult({ place, facilityKey, facilityLabel, canAdd, saved, onDetails, onAdd }: Props) {
  const image = safeTourismImageUrl(place.image);
  const [failedImage, setFailedImage] = useState('');
  return <article className={styles.card} data-naru-place-card="">
    <div className={styles.photo} aria-hidden="true">
      {image && failedImage !== image
        // A result uses only its own supplied photo; never substitute another attraction.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={image} alt="" width="160" height="200" loading="lazy" decoding="async"
          onError={() => setFailedImage(image)}
          onLoad={() => rememberPhotoCredits([{ title: place.name, image, location: place.city, source: place.source || '한국관광공사 관광정보' }])} />
        : <span><NightIcon name="photo-off" size={28} /><small>사진 없음</small></span>}
    </div>
    <div className={styles.info}>
      <span className={styles.city}>{place.city}</span>
      <button type="button" className={`naru-place-name ${styles.title}`} onClick={onDetails}>{place.name}</button>
      <p className={styles.address}>{place.address || '주소 정보 미제공'}</p>
      {facilityKey && <span className={`access-badge ${styles.evidence}`} data-evidence-state={placeFacilityState(place, facilityKey)}>{evidenceStateText(placeFacilityState(place, facilityKey), facilityLabel)}</span>}
      <div className={styles.actions}>
        <span className={styles.hint}>이름을 눌러 자세히</span>
        {canAdd
          ? <button type="button" className={styles.add} disabled={saved} onClick={onAdd}>{saved ? '✓ 담았음' : '담기'}</button>
          : <button type="button" className={styles.details} onClick={onDetails}>시설 정보 확인</button>}
      </div>
    </div>
  </article>;
}

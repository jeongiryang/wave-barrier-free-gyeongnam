'use client';
import { useEffect, useId, useState } from 'react';
import NightIcon from '../../../components/NightIcon';
import LoadingState from '../../../components/LoadingState';
import { usePlaceDialogFocus } from '../hooks/usePlaceDialogFocus';
import { useLocationSearchRequest } from '../hooks/useLocationSearchRequest';
import { regions } from '../constants';
import type { useTripSelection } from '../hooks/useTripSelection';
import PlaceFacilitySummary from './PlaceFacilitySummary';
import type { Place } from '../types';

export type OfficialCandidate = { name: string; scope: string; source: string; summary?: string; baseYm?: string; relatedTo?: string; distance?: string; minutes?: string; level?: string };

export default function OfficialCandidateDialog({ candidate, profiles, onClose, onPlace, trip }: { candidate: OfficialCandidate; profiles: string[]; trip: ReturnType<typeof useTripSelection>; onClose: () => void; onPlace: (place: Place) => void }) {
  const id = useId();
  const dialog = usePlaceDialogFocus(true, onClose);
  const region = regions.find(item => item !== '경남 전체' && candidate.scope.includes(item)) || '경남 전체';
  const { searchLocations, officialPlaces, officialState, placeSearchState } = useLocationSearchRequest(region, 'gyeongnam', profiles);
  const query = `${candidate.scope} ${candidate.name}`.trim();
  useEffect(() => { void searchLocations(query); }, [query, searchLocations]);
  const normalized = (name: string) => name.normalize('NFKC').replace(/\s/g, '').toLowerCase();
  // A statistical name is not a venue ID. Show the address for the user's choice;
  // never manufacture a saved place or inherit facilities from a namesake.
  const places = officialPlaces.filter(place => normalized(place.name) === normalized(candidate.name) && (region === '경남 전체' || place.city.includes(region) || place.address.includes(region)));
  const failed = placeSearchState === 'error' || officialState === 'error';
  return <dialog ref={dialog} className="region-change-dialog" aria-labelledby={id}>
    <header><h2 id={id} tabIndex={-1}>{candidate.name}</h2><button type="button" data-icon-action="" aria-label="상세정보 닫기" title="닫기" onClick={onClose}><NightIcon name="close"/></button></header>
    <p>{candidate.scope} · {candidate.source}</p>
    {candidate.summary && <p>{candidate.summary}</p>}
    {candidate.distance !== undefined && <dl className="modal-data"><div><dt>거리</dt><dd>{candidate.distance ? `${candidate.distance}km` : '미제공'}</dd></div><div><dt>소요시간</dt><dd>{candidate.minutes ? `${candidate.minutes}분` : '미제공'}</dd></div><div><dt>난이도</dt><dd>{candidate.level || '미제공'}</dd></div></dl>}
    {candidate.relatedTo && <p>함께 방문하는 곳: {candidate.relatedTo}</p>}
    {candidate.baseYm && <p>기준월: {/^[0-9]{6}$/.test(candidate.baseYm) ? `${candidate.baseYm.slice(0,4)}-${candidate.baseYm.slice(4)}` : '미제공'}</p>}
    <section aria-label="연결된 장소 정보">
      {placeSearchState === 'idle' || placeSearchState === 'loading' ? <LoadingState skeleton={false}>장소 정보를 불러오고 있어요.</LoadingState> : places.length ? places.map(place => <CandidatePlace key={JSON.stringify([place, profiles])} place={place} profiles={profiles} trip={trip} onDetails={() => { onClose(); onPlace(place); }}/>) : <p role="status">{failed ? '장소 정보를 불러오지 못했어요.' : '연결된 장소 정보가 아직 없어요.'}</p>}
      {failed && <button type="button" onClick={() => void searchLocations(query)}>다시 불러오기</button>}
    </section>
  </dialog>;
}

function CandidatePlace({ place, profiles, trip, onDetails }: { place: Place; profiles: string[]; trip: ReturnType<typeof useTripSelection>; onDetails: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const saved = trip.saved.includes(place.id);
  const fields = place.accessibility || [];
  const mismatch = fields.some(item => profiles.includes(item.key) && item.state === 'negative');
  const unknown = profiles.some(key => !fields.some(item => item.key === key && item.state === 'confirmed'));
  return <div><h3>{place.name}</h3><p>{place.address}</p><PlaceFacilitySummary place={place} en={false}/>
    {!saved && mismatch && <p>필요한 편의가 없는 것으로 기록되어 담을 수 없어요.</p>}
    {!saved && unknown && !mismatch && <label className="place-unknown-consent"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)}/>방문 전 확인할 후보로 담기</label>}
    <div className="place-card-actions"><span role="status">{saved ? '담았습니다' : ''}</span><button type="button" onClick={onDetails}>상세정보 보기</button><button type="button" disabled={!trip.storageReady || !saved && (mismatch || unknown && !acknowledged)} aria-pressed={saved} onClick={() => trip.toggleSaved(place.id, place)}><NightIcon name={saved ? 'check' : 'plus'} size={20}/>{saved ? '담았음 · 되돌리기' : '일정에 담기'}</button></div>
  </div>;
}

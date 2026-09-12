'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import WaveHeader from '../../components/WaveHeader';
import SkipLink from '../../components/SkipLink';
import LoadingState, { Spinner } from '../../components/LoadingState';
import NaruAvatar from '../../components/NaruAvatar';
import { regions, profiles as facilityProfiles } from '../planner/constants';
import type { Place } from '../planner/types';
import { plannerJson } from '../planner/services/api';
import { validTripDate, offsetTripDate } from '../../lib/trip-dates.js';
import { readSessionProfiles, saveSessionProfiles } from '../../lib/session-travel-profiles.js';
import { getTabStorage } from '../../lib/session-storage.js';
import { emptyTrip } from '../../lib/current-trip-storage.js';
import { replaceTripWithBackup } from '../../lib/trip-import.js';
import { addFestivalToTrip } from '../../lib/festival-trip.js';

type Festival = Place & { startDate: string; endDate: string; phone: string; officialUrl: string; state: 'ended'|'ongoing'|'upcoming'; facilityState: string };
type Result = { items: Festival[]; state: string; partial: boolean; checkedAt: string };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function FestivalCard({ festival, selectedProfiles, onOpen }: { festival: Festival; selectedProfiles: string[]; onOpen: (item: Festival, date: string, fresh: boolean, askNaru?: boolean) => void }) {
  const [date, setDate] = useState(festival.startDate < today() ? today() > festival.endDate ? festival.endDate : today() : festival.startDate);
  const [failedImage, setFailedImage] = useState(false), [details, setDetails] = useState(false);
  const confirmed = festival.accessibility?.filter(field => field.state === 'confirmed') || [];
  const unavailable = festival.accessibility?.some(field => field.state === 'negative');
  return <article className="festival-card"><div className="festival-card-photo">{festival.image && !failedImage ? <Image src={festival.image} alt={`${festival.name} 관광정보 사진`} fill sizes="(max-width: 700px) 100vw, (max-width: 1150px) 50vw, 33vw" unoptimized onError={() => setFailedImage(true)} /> : <div className="festival-photo-fallback"><NaruAvatar large /><span>사진 없이도 행사 정보를 확인할 수 있어요.</span></div>}<span className="festival-state">{festival.state === 'ongoing' ? '지금 열려요' : festival.state === 'upcoming' ? '곧 만나요' : '지난 행사'}</span></div>
    <div className="festival-card-copy"><small>{festival.city}</small><h2>{festival.name}</h2><p className="festival-period">{festival.startDate} – {festival.endDate}</p><p>{festival.address || '상세 행사장 주소 확인 필요'}</p>
      <p>{selectedProfiles.length ? festival.facilityState === 'error' ? '편의 정보를 불러오지 못했어요. 시설이 없다는 뜻은 아닙니다.' : confirmed.length ? `${confirmed.map(field => field.label).join(' · ')} 정보 확인` : '선택한 편의의 확인 근거가 아직 없어요.' : '필요한 편의를 선택하면 행사장 정보를 함께 비교해요.'}</p>
      <button type="button" className="festival-detail-toggle" aria-expanded={details} onClick={() => setDetails(!details)}>편의·문의 정보 {details ? '접기' : '보기'}</button>
      {details && <div className="festival-evidence">{festival.accessibility?.map(field => <p key={field.key}><strong>{field.label} · {field.state === 'confirmed' ? '확인됨' : field.state === 'negative' ? '조건과 맞지 않음' : '미확인'}</strong><span>{field.detail || '공식 정보에서 확인할 수 없어요.'}</span></p>)}{festival.phone && <p>행사 문의: {festival.phone}</p>}{festival.officialUrl && <a href={festival.officialUrl} target="_blank" rel="noreferrer">공식 관광정보 원문 ↗</a>}<small>ⓒ한국관광공사 · {festival.checkedAt?.slice(0, 10)} 조회</small></div>}
      {festival.state !== 'ended' && <><label className="festival-visit-date">방문 날짜<input type="date" min={festival.startDate} max={festival.endDate} value={date} onChange={event => setDate(event.target.value)} /></label>{unavailable ? <p role="status">선택한 편의와 맞지 않는 항목이 있어요. 필요한 편의를 유지하고 다른 행사를 살펴보세요.</p> : <div className="festival-actions"><button type="button" onClick={() => onOpen(festival, date, false)}>내 일정에 담기</button><button type="button" onClick={() => onOpen(festival, date, true, true)}>나루와 주변 코스 만들기</button><button type="button" onClick={() => onOpen(festival, date, true)}>이 축제로 새 여행</button></div>}</>}
    </div></article>;
}

export default function FestivalExplorer() {
  const router = useRouter();
  const [region, setRegion] = useState('경남 전체'), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [selected, setSelected] = useState<string[]>([]), [query, setQuery] = useState(''), [family, setFamily] = useState(false);
  const [data, setData] = useState<Result | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0), [settled, setSettled] = useState('');
  useEffect(() => { const frame = requestAnimationFrame(() => { setStart(today()); setEnd(offsetTripDate(today(), 30)); setSelected(readSessionProfiles(getTabStorage())); }); return () => cancelAnimationFrame(frame); }, []);
  const signature = JSON.stringify([region, start, end, selected, reload]);
  const validQuery = validTripDate(start) && validTripDate(end) && end >= start;
  const current = settled === signature && validQuery;
  const pending = validQuery && (!current || loading);
  const failure = current ? error : '';
  useEffect(() => {
    if (!validTripDate(start) || !validTripDate(end) || end < start) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      const params = new URLSearchParams({ region, start, end, profiles: selected.join(',') });
      void plannerJson<Result>(`/api/festivals?${params}`, { signal: controller.signal, timeoutMs: 15000 }).then(result => { if (!Array.isArray(result.items)) throw new Error(); if (!controller.signal.aborted) setData(result); }).catch(() => { if (!controller.signal.aborted) setError('축제 정보를 받지 못했어요. 날짜와 선택은 유지됩니다. 잠시 후 다시 시도해 주세요.'); }).finally(() => { if (!controller.signal.aborted) { setLoading(false); setSettled(signature); } });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  // The signature represents the complete request, including selected facilities.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const shown = (current && !failure ? data?.items : [])?.filter(item => item.name.includes(query.trim()) && (!family || !/맥주|와인|막걸리|주류|성인전용/.test(item.name))) || [];
  function openFestival(item: Festival, date: string, fresh: boolean, askNaru = false) {
    try {
      if (!current || pending || failure || !shown.some(candidate => candidate.id === item.id && candidate.startDate === item.startDate && candidate.endDate === item.endDate)) throw new Error('현재 조건의 축제 정보를 확인한 뒤 다시 골라주세요.');
      if (!validTripDate(date) || date < item.startDate || date > item.endDate) throw new Error('축제가 열리는 날짜를 골라주세요.');
      if (fresh) {
        const values = { ...emptyTrip(item.city, date, date), 'wave-saved-places': JSON.stringify([item.id]), 'wave-saved-place-catalog-v1': JSON.stringify([item]), 'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: [item.id] }), 'wave-trip-schedule-v1': JSON.stringify({ travelStart: date, travelEnd: date, dayStartTime: '10:00', scheduleAssignments: { [item.id]: date }, visitMinutesByPlaceId: { [item.id]: 120 } }) };
        replaceTripWithBackup(window.localStorage, values);
      } else addFestivalToTrip(window.localStorage, item, date);
      saveSessionProfiles(getTabStorage(), selected);
      const prompt = askNaru ? `일정에 담은 ${item.name} 축제 전후로 가까운 여행지를 넣어줘. 날짜와 필요한 편의를 유지해줘.` : '';
      router.push(`/planner?${new URLSearchParams({ ...(askNaru ? { assistant: 'naru', prompt } : {}), region: item.city })}#itinerary`);
    } catch (failure) { setNotice(failure instanceof Error && /[가-힣]/.test(failure.message) ? failure.message : '기기에 저장하지 못했어요. 기존 여행은 유지됩니다. 저장 공간을 확인해 주세요.'); }
  }
  return <main className="festival-page"><SkipLink href="#festival-results">축제 목록으로 바로가기</SkipLink><WaveHeader current="festivals" />
    <header className="festival-hero"><p className="horizon-eyebrow">A REASON TO GO</p><h1>축제가 열리는 날,<br />우리의 여행도 시작돼요.</h1><p>실제 개최 기간을 확인하고, 주변 여행지까지 한 번에 이어보세요.</p><Link href="/planner">만들던 여행 이어가기 ↗</Link></header>
    <section className="festival-filters" aria-label="축제 찾기"><label>지역<select value={region} onChange={event => setRegion(event.target.value)}>{regions.map(item => <option key={item}>{item}</option>)}</select></label><label>언제부터<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label><label>언제까지<input type="date" value={end} min={start} onChange={event => setEnd(event.target.value)} /></label><label>행사 이름<input type="search" placeholder="축제 이름으로 찾기" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="festival-preferences"><button type="button" aria-pressed={family} onClick={() => setFamily(!family)}>아이와 함께 · 주류 행사 제외</button><details><summary>필요한 편의 {selected.length ? `${selected.length}개 유지` : '선택'}</summary><div>{facilityProfiles.map(profile => <button key={profile.id} type="button" aria-pressed={selected.includes(profile.id)} onClick={() => setSelected(current => current.includes(profile.id) ? current.filter(id => id !== profile.id) : [...current, profile.id])}>{profile.label}</button>)}</div></details></div>
    </section>
    <section id="festival-results" className="festival-results" tabIndex={-1} aria-busy={pending}>{pending && <LoadingState>행사 날짜와 관광정보를 확인하고 있어요.</LoadingState>}{notice && <p className="result-notice" role="alert">{notice}</p>}{failure && <div className="result-notice error" role="alert"><p>{failure}</p><button type="button" onClick={() => setReload(current => current + 1)}>다시 조회</button></div>}
      {!validQuery && (start || end) && <p role="status">시작일부터 끝날까지 날짜를 골라주세요.</p>}
      {!pending && !failure && current && data && <p role="status">{shown.length}개의 축제 · {data.checkedAt.slice(0, 10)} 한국관광공사 조회{data.partial && ' · 일부 제공 범위의 결과입니다.'}</p>}
      {!pending && !failure && current && data && !shown.length && <div className="travel-book-empty"><h2>이 조건의 축제는 아직 확인하지 못했어요.</h2><p>편의 조건은 그대로 두고 지역이나 날짜를 넓혀보세요.</p><div className="travel-book-actions"><button type="button" onClick={() => { setRegion('경남 전체'); setQuery(''); }}>경남 전체 보기</button><button type="button" onClick={() => { const next = validTripDate(end) ? offsetTripDate(end, 1) : today(); setStart(next); setEnd(offsetTripDate(next, 30)); }}>다음 한 달 보기</button><Link href="/planner?assistant=naru">나루에게 다른 여행 물어보기</Link></div></div>}
      <div className="festival-grid" inert={pending || !current || Boolean(failure)}>{shown.map(item => <FestivalCard key={`${item.id}:${item.startDate}:${selected.join(',')}`} festival={item} selectedProfiles={selected} onOpen={openFestival} />)}</div>
      {pending && <div className="festival-grid" aria-hidden="true">{[0,1,2].map(id => <div className="festival-skeleton" key={id}><Spinner /></div>)}</div>}
    </section><footer className="festival-footer">행사 일정은 변경될 수 있어요. 출발 전 운영기관의 최신 공지를 확인해 주세요. <Link href="/policies">사진·정보 출처</Link></footer>
  </main>;
}

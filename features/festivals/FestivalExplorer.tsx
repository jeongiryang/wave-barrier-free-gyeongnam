'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import NightScene from '../../components/NightScene';
import NightBanner from '../../components/NightBanner';
import NightIcon from '../../components/NightIcon';
import MobileDisclosure from '../../components/MobileDisclosure';
import WaveHeader from '../../components/WaveHeader';
import SkipLink from '../../components/SkipLink';
import LoadingState, { Spinner } from '../../components/LoadingState';
import SiteFooter from '../../components/SiteFooter';
import { useOpenNaru } from '../../components/NaruContext';
import NaruAvatar from '../../components/NaruAvatar';
import { regions, profiles as facilityProfiles } from '../planner/constants';
import AccessibleDateInput from '../../components/AccessibleDateInput';
import { plannerJson } from '../planner/services/api';
import { validTripDate, offsetTripDate } from '../../lib/trip-dates.js';
import { readSessionProfiles, saveSessionProfiles } from '../../lib/session-travel-profiles.js';
import { getTabStorage } from '../../lib/session-storage.js';
import { emptyTrip } from '../../lib/current-trip-storage.js';
import { replaceTripWithBackup } from '../../lib/trip-import.js';
import FestivalAmenities from './FestivalAmenities';
import FestivalDetailDialog, { type FestivalDetail } from './FestivalDetailDialog';
import { addFestivalToTrip, existingFestivalVisit, rescheduleFestivalVisit } from '../../lib/festival-trip.js';

type Festival = FestivalDetail;
type Result = { items: Festival[]; state: string; partial: boolean; checkedAt: string };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function FestivalCard({ festival, selectedProfiles, onOpen }: { festival: Festival; selectedProfiles: string[]; onOpen: (item: Festival, date: string, fresh: boolean, askNaru?: boolean) => void }) {
  const openNaru = useOpenNaru();
  const [sources, setSources] = useState({ websiteUrl: festival.websiteUrl || '', officialUrl: festival.officialUrl });
  const [sourceState, setSourceState] = useState('idle');
  useEffect(() => {
    if (sourceState !== 'loading') return;
    const controller = new AbortController();
    void plannerJson<{websiteUrl: string; officialUrl: string}>(`/api/festivals?contentId=${encodeURIComponent(festival.id)}`, { signal: controller.signal, timeoutMs: 12000 }).then(value => { if (!controller.signal.aborted) { setSources(value); setSourceState('done'); } }).catch(() => { if (!controller.signal.aborted) setSourceState('error'); });
    return () => controller.abort();
  }, [sourceState, festival.id]);
  const [date, setDate] = useState(festival.startDate < today() ? today() > festival.endDate ? festival.endDate : today() : festival.startDate);
  const [failedImage, setFailedImage] = useState(false), [details, setDetails] = useState(false), [detailOpen, setDetailOpen] = useState(false);
  const confirmed = festival.accessibility?.filter(field => field.state === 'confirmed') || [];
  const unavailable = festival.accessibility?.some(field => field.state === 'negative');
  const visitActions = <>{festival.state !== 'ended' && <><label className="festival-visit-date">방문 날짜<AccessibleDateInput min={festival.startDate} max={festival.endDate} value={date} onChange={event => setDate(event.target.value)} /></label>{unavailable ? <p role="status">선택한 편의와 맞지 않는 항목이 있어요. 필요한 편의를 유지하고 다른 행사를 살펴보세요.</p> : <div className="festival-actions"><button type="button" onClick={() => { setDetailOpen(false); onOpen(festival, date, false); }}>내 일정에 담기</button><button type="button" onClick={() => { setDetailOpen(false); openNaru(`${festival.city} ${festival.name} 축제를 ${date}에 가는 일정안을 만들어줘. 기존에 선택한 편의는 유지해줘.`); }}>나루와 주변 코스 만들기</button><button type="button" onClick={() => { setDetailOpen(false); onOpen(festival, date, true); }}>이 축제로 새 여행</button></div>}</>}</>;
  return <article className="festival-card"><button type="button" className="festival-card-photo festival-card-open" onClick={() => setDetailOpen(true)} aria-label={`${festival.name} 축제 상세 보기`}>{festival.image && !failedImage ? <Image src={festival.image} alt={`${festival.name} 관광정보 사진`} fill sizes="25vw" unoptimized onError={() => setFailedImage(true)} /> : <div className="festival-photo-fallback"><NaruAvatar large /><span>사진 없이도 행사 정보를 확인할 수 있어요.</span></div>}<span className="festival-state">{festival.state === 'ongoing' ? '진행 중' : festival.state === 'upcoming' ? `D-${Math.max(0, Math.ceil((Date.parse(festival.startDate) - Date.parse(today())) / 86400000))}` : '종료'}</span></button>
    <div className="festival-card-copy"><small>{festival.city}</small><h2><button type="button" className="festival-title-open" onClick={() => setDetailOpen(true)}>{festival.name}</button></h2><p className="festival-period">{festival.startDate} – {festival.endDate}</p><p>{festival.address || '상세 행사장 주소 확인 필요'}</p>
      <p className="festival-facility-summary">{selectedProfiles.length ? festival.facilityState === 'error' ? '편의 정보를 불러오지 못했어요. 시설이 없다는 뜻은 아닙니다.' : confirmed.length ? `${confirmed.map(field => field.label).join(' · ')} 정보 확인` : '선택한 편의의 확인 근거가 아직 없어요.' : '필요한 편의를 선택하면 행사장 정보를 함께 비교해요.'}</p>
      <div className="night-facility-chips">{confirmed.map(field => <span key={field.key}><NightIcon name="access" size={15}/>{field.label}</span>)}</div><details className="night-festival-more"><summary>행사 정보·일정 담기 <NightIcon name="arrow" size={16}/></summary><div className="festival-source-links">{sources.websiteUrl && <a href={sources.websiteUrl} target="_blank" rel="noopener noreferrer">행사 홈페이지 ↗</a>}{sources.officialUrl && <a href={sources.officialUrl} target="_blank" rel="noopener noreferrer">관광정보 원문 ↗</a>}{!sources.websiteUrl && sourceState !== 'done' && <button type="button" disabled={sourceState === 'loading'} onClick={() => setSourceState('loading')}>{sourceState === 'loading' ? <><Spinner />행사 링크 확인 중</> : sourceState === 'error' ? '행사 링크 다시 확인' : '행사 홈페이지 확인'}</button>}{sourceState === 'done' && !sources.websiteUrl && <small>등록된 행사 홈페이지가 없어요.{festival.phone ? ` 문의 ${festival.phone}` : ''}</small>}{sourceState === 'error' && <small role="status">링크를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</small>}</div>
      <button type="button" className="festival-detail-toggle" aria-expanded={details} onClick={() => setDetails(!details)}>편의·문의 정보 {details ? '접기' : '보기'}</button>
      {details && <div className="festival-evidence">{festival.accessibility?.map(field => <p key={field.key}><strong>{field.label} · {field.state === 'confirmed' ? '확인됨' : field.state === 'negative' ? '조건과 맞지 않음' : '미확인'}</strong><span>{field.detail || '공식 정보에서 확인할 수 없어요.'}</span></p>)}{festival.phone && <p>행사 문의: {festival.phone}</p>}{festival.officialUrl && <a href={festival.officialUrl} target="_blank" rel="noreferrer">공식 관광정보 원문 ↗</a>}<small>ⓒ한국관광공사 · {festival.checkedAt?.slice(0, 10)} 조회</small></div>}
      {visitActions}
    </details></div><FestivalAmenities place={festival}/>{detailOpen && <FestivalDetailDialog festival={festival} websiteUrl={sources.websiteUrl} onClose={() => setDetailOpen(false)} visitActions={visitActions} />}</article>;
}

export default function FestivalExplorer() {
  const [region, setRegion] = useState('경남 전체'), [start, setStart] = useState(''), [end, setEnd] = useState('');
  const [selected, setSelected] = useState<string[]>([]), [query, setQuery] = useState(''), [family, setFamily] = useState(false);
  const [data, setData] = useState<Result | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [keyword, setKeyword] = useState('전체'), [sort, setSort] = useState('추천순'), [listView, setListView] = useState(false);
  const [eventState, setEventState] = useState('all');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const preferencesId = useId();
  const preferencesRef = useRef<HTMLDivElement>(null);
  const preferencesTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (event.target instanceof Node && !preferencesRef.current?.contains(event.target)) setPreferencesOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const [duplicate, setDuplicate] = useState<{ item: Festival; date: string; previous: string; revision: string } | null>(null);
  useEffect(() => { if (duplicate) document.getElementById('festival-existing-visit')?.focus(); }, [duplicate]);
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
  const matchesKeyword = (name: string) => keyword === '전체' || keyword === '가족 추천' || ({ '가을축제': /가을|국화|코스모스|단풍|억새/, '먹거리 축제': /음식|먹거리|수산|전어|대하|한우|사과/, '문화예술': /문화|예술|영화|음악|공연/, '국악·전통': /국악|전통|탈춤|유등/, '꽃 축제': /꽃|국화|코스모스|벚꽃|장미/, '바다·해양': /바다|해양|항|수산/ }[keyword]?.test(name) ?? true);
  const shown = (current && !failure ? data?.items : [])?.filter(item => (eventState === 'all' || item.state === eventState) && item.name.includes(query.trim()) && matchesKeyword(item.name) && (!family || !/맥주|와인|막걸리|주류|성인전용/.test(item.name))) || [];
  if (sort === '가까운 날짜순') shown.sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (sort === '이름순') shown.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  function openFestival(item: Festival, date: string, fresh: boolean, askNaru = false) {
    try {
      if (!current || pending || failure || !shown.some(candidate => candidate.id === item.id && candidate.startDate === item.startDate && candidate.endDate === item.endDate)) throw new Error('현재 조건의 축제 정보를 확인한 뒤 다시 골라주세요.');
      if (!validTripDate(date) || date < item.startDate || date > item.endDate) throw new Error('축제가 열리는 날짜를 골라주세요.');
      if (fresh) {
        const values = { ...emptyTrip(item.city, date, date), 'wave-saved-places': JSON.stringify([item.id]), 'wave-saved-place-catalog-v1': JSON.stringify([item]), 'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: [item.id] }), 'wave-trip-schedule-v1': JSON.stringify({ travelStart: date, travelEnd: date, dayStartTime: '10:00', scheduleAssignments: { [item.id]: date }, visitMinutesByPlaceId: { [item.id]: 120 } }) };
        replaceTripWithBackup(window.localStorage, values);
      } else if (!addFestivalToTrip(window.localStorage, item, date)) {
        const existing = existingFestivalVisit(window.localStorage, item.id);
        if (!existing) throw new Error('기존 일정을 다시 확인해 주세요.');
        setDuplicate({ item, date, previous: existing.date, revision: existing.revision });
        setNotice('');
        return;
      }
      saveSessionProfiles(getTabStorage(), selected);
      const prompt = askNaru ? `일정에 담은 ${item.name} 축제 전후로 가까운 여행지를 넣어줘. 날짜와 필요한 편의를 유지해줘.` : '';
      window.location.assign(`/planner?${new URLSearchParams({ ...(askNaru ? { assistant: 'naru', prompt } : {}), region: item.city })}#itinerary`);
    } catch (failure) { setNotice(failure instanceof Error && /[가-힣]/.test(failure.message) ? failure.message : '기기에 저장하지 못했어요. 기존 여행은 유지됩니다. 저장 공간을 확인해 주세요.'); }
  }
  return <main className="festival-page wave-night"><SkipLink href="#festival-results">축제 목록으로 바로가기</SkipLink><NightScene kind="festival"><WaveHeader current="festivals" />
    <NightBanner kind="festival" /></NightScene>
    <div className="night-festival-workspace">
    {duplicate && <section className="result-notice festival-existing-visit" id="festival-existing-visit" tabIndex={-1} aria-label="이미 담긴 축제">
      <h2>이미 일정에 담겨 있어요</h2><p>{duplicate.item.name} · 기존 방문일 {duplicate.previous}</p>
      {duplicate.date !== duplicate.previous && <p>선택한 날짜는 {duplicate.date}입니다. 확인하기 전에는 기존 날짜를 바꾸지 않아요.</p>}
      <div className="travel-book-actions"><Link href={`/planner?${new URLSearchParams({ region: duplicate.item.city, visit: duplicate.item.id })}#itinerary`}>기존 일정 보기</Link>
      {duplicate.date !== duplicate.previous && <><button type="button" onClick={() => { setNotice(`기존 방문일 ${duplicate.previous}을 유지했어요.`); setDuplicate(null); }}>기존 날짜 유지</button><button type="button" onClick={() => {
        try {
          if (!current || pending || failure) throw new Error('축제 조회가 끝나면 날짜 변경을 다시 확인해 주세요.');
          rescheduleFestivalVisit(window.localStorage, duplicate.item, duplicate.date, duplicate.revision);
          setNotice(`방문 날짜를 ${duplicate.date}로 변경했어요. 다른 일정과 여행 기간은 유지됩니다.`);
          setDuplicate({ ...duplicate, previous: duplicate.date, revision: existingFestivalVisit(window.localStorage, duplicate.item.id)!.revision });
        } catch (error) { setNotice(error instanceof Error && /[가-힣]/.test(error.message) ? error.message : '날짜를 저장하지 못했어요. 기존 일정은 유지됩니다.'); }
      }}>선택 날짜로 변경</button></>}
      <button type="button" onClick={() => setDuplicate(null)}>닫기</button></div>
    </section>}
    <MobileDisclosure title="축제 검색 조건" className="mobile-festival-filters">
    <section className="festival-filters" aria-label="축제 찾기">
      <label><NightIcon name="pin"/><span>지역 선택<select value={region} onChange={event => setRegion(event.target.value)}>{regions.map(item => <option key={item}>{item}</option>)}</select></span></label>
      <div className="night-festival-dates"><NightIcon name="calendar"/><span>날짜 범위<span className="night-date-pair"><AccessibleDateInput aria-label="언제부터" value={start} onChange={event => setStart(event.target.value)} /><span>~</span><AccessibleDateInput aria-label="언제까지" value={end} min={start} onChange={event => setEnd(event.target.value)} /></span></span></div>
      <label><NightIcon name="search"/><span>행사명 검색<input type="search" placeholder="축제 이름을 입력하세요" value={query} onChange={event => setQuery(event.target.value)} /></span></label>
      <div className="festival-preferences" ref={preferencesRef} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setPreferencesOpen(false); }} onKeyDown={event => { if (event.key === 'Escape' && preferencesOpen && !event.defaultPrevented) { event.preventDefault(); setPreferencesOpen(false); preferencesTrigger.current?.focus(); } }}><NightIcon name="access"/><div className="festival-preference-disclosure"><button type="button" className="festival-preference-trigger" ref={preferencesTrigger} aria-expanded={preferencesOpen} aria-controls={preferencesId} onClick={() => setPreferencesOpen(value => !value)}>접근성 조건 <span>{selected.length ? `${selected.length}개 선택` : '전체'}</span></button>{preferencesOpen && <div id={preferencesId} className="festival-preference-panel">{facilityProfiles.map(profile => <button key={profile.id} type="button" aria-label={profile.label} aria-pressed={selected.includes(profile.id)} onClick={() => setSelected(current => current.includes(profile.id) ? current.filter(id => id !== profile.id) : [...current, profile.id])}>{profile.label}</button>)}</div>}</div></div>
      <button className="primary night-festival-search" type="button" onClick={() => setReload(current => current + 1)}>축제 검색하기 <NightIcon name="arrow"/></button>
    </section>
    <div className="night-festival-keywords" role="group" aria-label="축제 키워드"><strong>인기 키워드</strong>{['전체','가을축제','먹거리 축제','문화예술','국악·전통','꽃 축제','바다·해양','가족 추천'].map(item => <button type="button" key={item} disabled={!start} aria-pressed={keyword === item} onClick={() => { setKeyword(item); if (item === '가족 추천') setFamily(true); }}>{item}</button>)}<button type="button" className="night-family-toggle" disabled={!start} aria-pressed={family} onClick={() => setFamily(!family)}>주류 행사 제외</button></div>
    </MobileDisclosure>
    <div className="festival-state-tabs" role="group" aria-label="축제 진행 상태">{[['all','전체'],['ongoing','진행 중'],['upcoming','예정'],['ended','종료']].map(([value,label]) => <button type="button" key={value} aria-pressed={eventState === value} onClick={() => setEventState(value)}>{label}</button>)}</div>
    <div className="night-festival-heading"><h2><NightIcon name="star"/>지금, 경남에서 만나는 축제 <em>{current && !pending && !failure ? shown.length : ''}</em></h2><div><select aria-label="축제 정렬" value={sort} onChange={event => setSort(event.target.value)}>{['추천순','가까운 날짜순','이름순'].map(item => <option key={item}>{item}</option>)}</select><button type="button" aria-label={listView ? '카드형으로 보기' : '목록형으로 보기'} aria-pressed={listView} onClick={() => setListView(!listView)}><NightIcon name={listView ? 'grid' : 'list'}/></button></div></div>
    <section id="festival-results" className="festival-results" tabIndex={-1} aria-busy={pending}>{pending && <LoadingState>행사 날짜와 관광정보를 확인하고 있어요.</LoadingState>}{notice && <p className="result-notice" role="alert">{notice}</p>}{failure && <div className="result-notice error" role="alert"><p>{failure}</p><button type="button" onClick={() => setReload(current => current + 1)}>다시 조회</button></div>}
      {!validQuery && (start || end) && <p role="status">시작일부터 끝날까지 날짜를 골라주세요.</p>}
      {!pending && !failure && current && data && <p role="status">{shown.length}개의 축제 · {data.checkedAt.slice(0, 10)} 한국관광공사 조회{data.partial && ' · 일부 제공 범위의 결과입니다.'}</p>}
      {!pending && !failure && current && data && !shown.length && <div className="travel-book-empty"><h2>이 조건의 축제는 아직 확인하지 못했어요.</h2><p>편의 조건은 그대로 두고 지역이나 날짜를 넓혀보세요.</p><div className="travel-book-actions"><button type="button" onClick={() => { setRegion('경남 전체'); setQuery(''); setKeyword('전체'); }}>경남 전체 보기</button><button type="button" onClick={() => { const next = validTripDate(end) ? offsetTripDate(end, 1) : today(); setStart(next); setEnd(offsetTripDate(next, 30)); }}>다음 한 달 보기</button><Link href="/planner?assistant=naru">나루에게 다른 여행 물어보기</Link></div></div>}
      <div className={`festival-grid${listView ? " night-festival-list" : ""}`} inert={pending || !current || Boolean(failure)}>{shown.map(item => <FestivalCard key={`${item.id}:${item.startDate}:${selected.join(',')}`} festival={item} selectedProfiles={selected} onOpen={openFestival} />)}</div>
      {pending && <div className="festival-grid" aria-hidden="true">{[0,1,2,3].map(id => <div className="festival-skeleton" key={id}><Spinner /></div>)}</div>}
    </section>
    </div><NightScene kind="festival" closing><section className="night-festival-courses"><header><NightIcon name="pin"/><h2>축제와 함께 여행을 떠나보세요</h2><p>축제 주변의 여행지를 일정으로 이어보세요.</p><Link href="/planner">전체 여행 코스 보기 →</Link></header><div><Link className="night-course-map" href="/planner"><NightIcon name="map" size={52}/><strong>축제가 있는<br/>더 넓은 경남</strong><span>경남 전체 지도 보기 →</span></Link>{shown.slice(0,3).map(item => <Link className="night-course-card" key={item.id} href={`/planner?region=${encodeURIComponent(item.city)}`}><span>{item.image && <Image src={item.image} alt="" fill sizes="120px" unoptimized/>}</span><div><strong>{item.city} 축제와 주변 여행</strong><p>{item.name}</p><small>주변 여행지 둘러보기 →</small></div></Link>)}{!shown.length && <Link className="night-course-empty" href="/planner">여행 지역을 고르고 나에게 맞는 코스를 만들어보세요 <NightIcon name="arrow"/></Link>}</div></section>
    <SiteFooter /></NightScene>
  </main>;
}

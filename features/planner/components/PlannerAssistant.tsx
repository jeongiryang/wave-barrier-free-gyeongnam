"use client";
import { PlannerToolSurfaces, usePlannerTools, toolSurfaceGroup } from "./PlannerToolSurface";

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import LoadingState, { Spinner } from '../../../components/LoadingState';
import { localAssistantAction, validateAssistantAction, type AssistantAction } from '../../../lib/assistant-actions.js';
import { onTripIdentity, readOnTrip } from '../../../lib/on-trip.js';
import type { TripCommand, TripCommandReceipt } from '../../../lib/trip-command.js';
import { FACILITIES, resolveFacilityKeys } from '../../../lib/facility-selection.js';
import { evidenceGroupTitle, evidenceSentence, evidenceStateText, groupByEvidence, placeFacilityState, tallyEvidence, weakestFacility } from '../../../lib/naru-evidence.js';
import { guidancePreferenceText } from '../../../lib/guidance-preferences.js';
import { acceptsPendingChange, canRunConversationAction, isChangeNegated, resolveConversationReference } from '../../../lib/assistant-conversation.js';
import type { usePlannerPlan } from '../hooks/usePlannerPlan';
import type { useTripSelection } from '../hooks/useTripSelection';
import { useTravelVoice } from '../hooks/useTravelVoice';
import { profiles, themes } from '../constants';
import type { Place, PlanData } from '../types';
import type { NaruJourney } from '../../../lib/naru-journey.js';
import { requestNaruJourney } from '../services/naru-journey';
import { isNaruStream, readNaruStream } from '../services/naru-stream';
import NaruJourneyProposal from './NaruJourneyProposal';
import NaruWorkspaceIcon from './NaruWorkspaceIcon';
import NaruWorkRequest from './NaruWorkRequest';
import NaruWorkspaceAside from './NaruWorkspaceAside';
import { replaceTripWithBackup } from '../../../lib/trip-import.js';
import { emptyTrip, TRIP_IDENTITY_KEY, assertTripStorageOwner, tripStorageFailed } from '../../../lib/current-trip-storage.js';
import { saveSessionProfiles } from '../../../lib/session-travel-profiles.js';
import { getTabStorage } from '../../../lib/session-storage.js';
import { ensureTripIdentity, readTripIdentity } from '../../../lib/trip-identity.js';
import { readNaruWorkspaces, saveNaruWorkspace, removeNaruWorkspace, type NaruWorkspace } from '../../../lib/naru-workspaces.js';
import { naruLocalHelp } from '../../../lib/naru-help.js';
import { usePathname } from 'next/navigation';
import NaruAvatar from '../../../components/NaruAvatar';
import { useSitePreferences } from '../../preferences/context';
import { naruGuideTones } from '../naru-copy';
import { toneText } from '../../../lib/tone-copy.js';
import VoiceInputMeter from './VoiceInputMeter';
import { naruDirectCommand, naruEditClarification } from '../../../lib/naru-direct-command.js';
import { startNaruGuide, advanceNaruGuide, type NaruGuide } from '../../../lib/naru-guided-start.js';
import { buildItinerarySchedule } from '../optimization/itinerary-schedule.js';
import type { RoutePoint } from '../../routing/types';
import NaruPhotoAttachment from './NaruPhotoAttachment';
import type { AssistantPhoto } from '../../../lib/assistant-photo.js';
import { useNaruAvailability } from '../hooks/useNaruAvailability';
import type { GuidancePreferences } from '../../../lib/guidance-preferences.js';
import NaruHelpHub from './NaruHelpHub';
import { useTravelBook } from '../../travel-book/useTravelBook';
import EvidenceCoverageCard from './EvidenceCoverageCard';
import { sanitizePhotoTripFacts, verifyPhotoTripFacts, type PhotoTripFact } from '../../../lib/photo-trip-facts.js';
type PhotoVerifiedItem = { fact: PhotoTripFact; state: 'verified'|'ambiguous'|'not-found'; place: Place | null };
const NaruTripReview = lazy(() => import('./NaruTripReview'));
const NaruScheduleReview = lazy(() => import('./NaruScheduleReview'));

// evidenceKeys/evidenceRegion은 답변이 확정된 순간의 편의 조건과 지역을 함께
//굳혀 둔다. 뒤에 조건을 바꿔도 이미 그려진 답변의 숫자가 흔들리지 않는다.
type Message = { cancelled?: boolean; id: number; role: 'user'|'assistant'; text: string; source?: string; proposal?: AssistantAction; draft?: NaruJourney; revision?: string; applied?: boolean; results?: Place[]; receipt?: TripCommandReceipt; resultKey?: string; toolId?: string; evidenceKeys?: string[]; evidenceRegion?: string; photoItems?: PhotoVerifiedItem[] };
type Props = { onNewTrip: () => boolean; origin: RoutePoint; routeMinutes: Record<string, number>; launchRequest?: { id: number; prompt: string }; pageContext?: string; open: boolean; onClose: () => void; plan: ReturnType<typeof usePlannerPlan>; trip: ReturnType<typeof useTripSelection>; guidance: { value: GuidancePreferences; update: (value: GuidancePreferences) => void }; onRegion: (region: string, onCommitted?: () => void) => void; onSearch: (criteria?: { region?: string; profiles?: string[]; themes?: string[] }) => Promise<PlanData | null>; onPlace: (place: Place) => void; onAlternative: (placeId: string) => void; onUndoAlternative: () => boolean; canUndoAlternative: boolean; replacementVersion: number; onOpenTool: (tool: string) => void; transport: 'walk'|'bicycle'|'transit'|'car'; routeRevision: string; onJourneyApplied: (draft: NaruJourney) => { undo: () => void; revision: string }; onRecalculate: (transport?: AssistantAction['transport']) => Promise<'changed'|'checked'>; onActivity: (value: { phase: string; text: string }) => void };
const toolGroups = [
  { title: '여행 시작', items: [['conditions','지역·활동'],['facilities','필요한 편의'],['dates','날짜·기간'],['places','여행지 찾기']] },
  { title: '내 일정', items: [['itinerary','날짜·순서·시간'],['receipt','일정 선정 근거'],['map','지도·경로'],['alternatives','한 곳 바꾸기'],['comfort','이동 부담·휴식'],['course','코스 잇기'],['split','동행·합류']] },
  { title: '여행 준비', items: [['readiness','출발 전 확인'],['weather','날씨'],['transport','교통·귀가'],['compare','편의 비교'],['preview','주차·입구 미리보기'],['transcript','해설 대본'],['inquiry','방문 전 문의'],['budget','여행비']] },
  { title: '저장과 활용', items: [['save','내 여행에 저장'],['share','공유'],['offline','오프라인 요약'],['calendar','캘린더'],['on-trip','여행 당일 안내']] },
];
const toolLabel = (id: string) => toolGroups.flatMap(group => group.items).find(item => item[0] === id)?.[1] || '여행 도구';
const transportLabels = { car: '자동차', transit: '대중교통', walk: '도보', bicycle: '자전거' };
const starterChoices = [
  { id: 'wheel', label: '휠체어 이동에 필요한 시설', facilities: ['route','elevator','restroom','parking','wheelchair'] },
  { id: 'rest', label: '걷기와 휴식을 여유롭게', facilities: [], comfort: true },
  { id: 'baby', label: '유모차·수유·유아 시설', facilities: ['stroller','lactationroom','babysparechair'], guidance: { easyNarration: true } },
  { id: 'visual', label: '음성·큰 글자 안내', facilities: ['audioguide','bigprint','guidehuman'], guidance: { audioFirst: true } },
  { id: 'hearing', label: '문자·영상 안내', facilities: ['signguide','videoguide','hearingroom'], guidance: { textFirst: true } },
  { id: 'simple', label: '짧게, 한 번에 하나씩', facilities: [], guidance: { briefAnswers: true, oneAtATime: true } },
] as const;
const starterPrompts = ['휠체어로 이동하기 편한 통영 당일 여행을 찾아줘', '부모님과 천천히 걷고 자주 쉬는 일정으로 바꿔줘', '담은 장소들의 편의시설을 비교해줘', '비나 휴무에 대비한 대체 장소를 보여줘', '이 안내문 사진에서 장소와 시간을 읽어줘'];
const storedNaruSize = () => { try { return typeof window !== 'undefined' ? localStorage.getItem('wave-naru-size-v1') : null; } catch { return null; } };
const storedNaruStarter = () => { try { return typeof window !== 'undefined' ? localStorage.getItem('wave-naru-starter-v1') : null; } catch { return null; } };

export default function PlannerAssistant(props: Props) {
  const { plan, trip, onClose } = props;
  const internalTools = usePlannerTools();
  const { tone } = useSitePreferences();
  // 안내 문구에만 말투를 적용한다. 버튼 이름과 오류 문구는 표준말로 고정한다.
  const say = (entry: { standard: string; gyeongnam?: string }) => toneText(entry, tone);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'assistant', text: '어디로 여행할까요? 지역이나 하고 싶은 일을 알려주세요.' }]);
  const [input, setInput] = useState(''), [busy, setBusy] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'conversation'|'tools'|'saved'>('conversation');
  const [toolSequence, setToolSequence] = useState(0);
  if (toolSequence !== internalTools.request.sequence) { setToolSequence(internalTools.request.sequence); setWorkspaceTab('tools'); }
  const [workspaces, setWorkspaces] = useState<readonly NaruWorkspace[]>([]);
  const [workRequestOpen, setWorkRequestOpen] = useState(false);
  const [pendingResume, setPendingResume] = useState<NaruWorkspace | null>(null);
  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  const loadedWorkspace = useRef('');
  const workspaceNavigation = useRef(false);
  const [size, setSize] = useState<'compact'|'large'>(() => storedNaruSize() === 'compact' ? 'compact' : 'large');
  const [starterDone, setStarterDone] = useState(() => trip.saved.length > 0 || storedNaruStarter() === 'done'), [starterOpen, setStarterOpen] = useState(() => !trip.saved.length && storedNaruStarter() !== 'done'), [starterSelected, setStarterSelected] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const { available, checking, recheck, markConnected } = useNaruAvailability(props.open);
  const [showEvidence, setShowEvidence] = useState(false);
  const [reviewHours, setReviewHours] = useState(false);
  const [reviewTrip, setReviewTrip] = useState(false);
  const [photo, setPhoto] = useState<AssistantPhoto | null>(null), [photoPreparing, setPhotoPreparing] = useState(false);
  const [guide, setGuide] = useState<NaruGuide | null>(null);
  const [activity, setActivity] = useState({ phase: 'idle', text: '' });
  // 도착 중인 글자. 완료되면 비우고 확정된 답변을 대화에 남긴다.
  const [streamText, setStreamText] = useState('');
  const [focusedPlaceId, setFocusedPlaceId] = useState('');
  const { books: savedTravelBooks, archive, restore, storageError: bookStorageError } = useTravelBook();
  const sequence = useRef(0), request = useRef<AbortController | null>(null), messageId = useRef(0);
  const cancelRequest = useCallback(() => { sequence.current++; request.current?.abort(); }, []);
  useEffect(() => () => cancelRequest(), [cancelRequest]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  const journeyUndo = useRef<{ region: string; themes: string[]; profiles: string[]; criteria: string; route: { undo: () => void; revision: string } } | null>(null);
  const executed = useRef(new Set<number>());
  const shownPlaces = useRef<Place[]>([]), focusedPlace = useRef(''), scrollPosition = useRef(0);
  const setFocused = (id: string) => { focusedPlace.current = id; setFocusedPlaceId(id); };
  const inputRef = useRef<HTMLTextAreaElement>(null), log = useRef<HTMLDivElement>(null), follow = useRef(true);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const voice = useTravelVoice();
  const pathname = usePathname();
  const known = [...new Map([...trip.orderedSavedPlaces, ...(plan.resultCurrent ? [...(plan.plan?.places || []), ...(plan.plan?.explorationPlaces || [])] : [])].map(place => [place.id, place])).values()];
  const revision = JSON.stringify([plan.region, plan.themes, plan.selected, plan.resultCurrent, plan.plan?.generatedAt, trip.voiceRevision, props.transport]);
  const liveRevision = useRef(revision);
  useLayoutEffect(() => { liveRevision.current = revision; }, [revision]);
  useEffect(() => {
    if (!props.launchRequest?.prompt) return;
    const frame = requestAnimationFrame(() => setInput(props.launchRequest!.prompt));
    return () => cancelAnimationFrame(frame);
  }, [props.launchRequest]);
  const append = (text: string, extra: Partial<Message> = {}) => { const message = { id: ++messageId.current, role: 'assistant' as const, text, ...extra }; setMessages(current => [...current.slice(-29), message]); return message; };

  useEffect(() => {
    if (!props.open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const media = window.matchMedia('(max-width: 800px)');
    const present = () => {
      if (!dialog) return;
      if (dialog.open) dialog.close();
      if (media.matches || size === 'large') dialog.showModal(); else dialog.show();
    };
    present();
    media.addEventListener('change', present);
    inputRef.current?.focus({ preventScroll: true });
    if (log.current) log.current.scrollTop = scrollPosition.current;
    return () => { media.removeEventListener('change', present); if (dialog?.open) dialog.close(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); };
  }, [props.open, cancelRequest, size]);
  useLayoutEffect(() => { if (follow.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, busy, showEvidence, streamText]);
  useLayoutEffect(() => { const field = inputRef.current; if (field) { field.style.height = 'auto'; field.style.height = `${Math.min(128, Math.max(44, field.scrollHeight))}px`; } }, [input, props.open]);
  const { cancel: cancelVoice } = voice;
  useEffect(() => { if (!props.open) cancelVoice(); }, [props.open, cancelVoice]);
  useEffect(() => () => cancelVoice(), [pathname, cancelVoice]);

  const close = useCallback(() => {
    if (log.current) scrollPosition.current = log.current.scrollTop;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    onClose();
    returnFocus.current?.focus({ preventScroll: true });
  }, [onClose]);
  function openTool(id: string, placeId = '') {
    finishStarter();
    if (placeId) setFocused(placeId);
    const needsPlaces = !['conditions','facilities','dates','comfort','places','inquiry','compare','preview','transcript'].includes(id);
    if (needsPlaces && !trip.saved.length) {
      append(`${toolLabel(id)}는 일정에 장소를 담으면 이어서 사용할 수 있어요. 여행지를 골라볼까요?`);
      id = plan.resultCurrent ? 'places' : 'conditions';
    } else if (id === 'places' && !plan.resultCurrent) {
      append('여행 조건을 고르고 여행지를 찾아주세요. 결과에서 마음에 드는 곳을 담을 수 있어요.');
      id = 'conditions';
    }
    append(`${toolLabel(id)}에서 현재 여행을 이어서 확인할 수 있어요.`, { toolId: id });
    setToolsOpen(false); setWorkspaceTab('conversation'); follow.current = true;
  }

  function finishStarter() {
    setStarterDone(true);
    setStarterOpen(false);
    try { localStorage.setItem('wave-naru-starter-v1', 'done'); } catch { /* no-op */ }
  }

  function toggleStarter() {
    setWorkspaceTab('conversation');
    setStarterOpen(current => !current);
    setStarterSelected([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function confirmStarter(skip = false) {
    if (!skip) {
      const chosen = starterChoices.filter(item => starterSelected.includes(item.id));
      const facilities = [...new Set([...plan.selected, ...chosen.flatMap(item => [...item.facilities])])];
      if (facilities.length !== plan.selected.length) plan.setSelected(facilities);
      if (chosen.some(item => 'comfort' in item && item.comfort)) trip.setComfort({ ...trip.comfort, maxWalkMinutes: trip.comfort.maxWalkMinutes ?? 15, breakEveryMinutes: trip.comfort.breakEveryMinutes ?? 60, breakMinutes: Math.max(15, trip.comfort.breakMinutes) });
      const nextGuidance = chosen.reduce<GuidancePreferences>((current, item) => ({ ...current, ...('guidance' in item ? item.guidance : {}) }), props.guidance.value);
      props.guidance.update(nextGuidance);
    }
    finishStarter();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function goToTool(id: string) {
    if (toolSurfaceGroup(id)) { props.onOpenTool(id); setWorkspaceTab("tools"); return; }
    if (log.current) scrollPosition.current = log.current.scrollTop;
    props.onOpenTool(id); close();
  }

  async function sendPhoto(value: string, attached: AssistantPhoto) {
    if (!starterDone) finishStarter();
    const text = value.trim() || '사진에서 여행에 필요한 장소·날짜·시간을 읽어줘.';
    const id = ++sequence.current, control = new AbortController();
    request.current = control; setBusy(true); setInput(''); follow.current = true;
    setMessages(current => [...current.slice(-29), { id: ++messageId.current, role: 'user', text: `사진 1장 첨부 · ${text}`, source: 'photo-input' }]);
    const progress = { phase: 'thinking', text: '사진의 글자를 읽고 있어요.' }; setActivity(progress); props.onActivity(progress);
    const timer = setTimeout(() => control.abort(), 48000);
    try {
      const response = await fetch('/api/assistant', { method: 'POST', credentials: 'same-origin', signal: control.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: text }], photo: attached }) });
      const data = await response.json();
      if (id !== sequence.current) return;
      if (!response.ok || data.photoReview !== true || typeof data.reply !== 'string') throw new Error(typeof data.error === 'string' ? data.error : '사진을 읽지 못했어요.');
      markConnected(); setPhoto(null);
      const facts = sanitizePhotoTripFacts(data.photoFacts);
      let candidates = known;
      let items = verifyPhotoTripFacts(facts, candidates) as PhotoVerifiedItem[];
      if (facts.some(fact => fact.name) && !items.some(item => item.state === 'verified')) {
        const verifying = { phase: 'thinking', text: '사진의 장소를 관광 공공데이터에서 확인하고 있어요.' }; setActivity(verifying); props.onActivity(verifying);
        const searched = await props.onSearch({ region: facts.find(fact => fact.region)?.region || plan.region || '경남 전체' });
        if (id !== sequence.current) return;
        candidates = searched ? [...searched.places, ...(searched.explorationPlaces || [])] : candidates;
        items = verifyPhotoTripFacts(facts, candidates) as PhotoVerifiedItem[];
      }
      append(data.reply.slice(0, 1000), { source: 'local-vision', photoItems: items });
      const done = { phase: 'done', text: items.some(item => item.state === 'verified') ? '사진 내용과 공식 장소를 함께 확인했어요.' : '사진 내용은 읽었지만 같은 공식 장소를 찾지 못했어요.' }; setActivity(done); props.onActivity(done);
    } catch (error) {
      if (id !== sequence.current) return;
      setInput(current => current || value);
      append(`${error instanceof Error && error.name !== 'AbortError' ? error.message : '사진을 읽는 시간이 길어져 중단했어요.'} 사진과 질문은 남겨두었으니 다시 보내주세요.`);
      const warning = { phase: 'warning', text: '사진은 입력창에 남아 있어요. 다시 보낼 수 있어요.' }; setActivity(warning); props.onActivity(warning);
    } finally { clearTimeout(timer); if (id === sequence.current) { setBusy(false); request.current = null; } }
  }
  function applyPhotoItems(message: Message) {
    const verified = (message.photoItems || []).filter((item): item is PhotoVerifiedItem & { place: Place } => item.state === 'verified' && Boolean(item.place));
    const additions = verified.filter(item => !trip.saved.includes(item.place.id));
    if (!additions.length) { append(verified.length ? '확인된 장소가 이미 일정에 담겨 있어요.' : '공식 관광정보에서 하나로 확인된 장소가 없어요.'); return; }
    const commands: TripCommand[] = [];
    const photoDates = additions.map(item => item.fact.date).filter(Boolean).sort();
    const completePhotoDates = photoDates.length === additions.length;
    if (!trip.saved.length && completePhotoDates) commands.push({ type: 'schedule', start: photoDates[0], end: photoDates.at(-1)! });
    for (const item of additions) commands.push({ type: 'add', id: item.place.id, day: trip.saved.length ? (trip.tripDays.includes(item.fact.date) ? item.fact.date : trip.activeDay) : item.fact.date });
    const receipt = trip.applyTripCommand(commands, additions.map(item => item.place));
    if (!receipt.ok) { append(receipt.reason); return; }
    setMessages(current => current.map(item => item.id === message.id ? { ...item, applied: true, receipt } : item));
    const outside = trip.saved.length > 0 && additions.some(item => item.fact.date && !trip.tripDays.includes(item.fact.date));
    append(`${additions.length}곳을 공식 관광정보의 장소 ID로 일정에 담았어요.${outside ? ' 사진의 날짜가 현재 여행 기간 밖인 장소는 현재 선택한 날에 담았어요.' : completePhotoDates ? ' 사진에서 확인한 날짜에 담았어요.' : ''}`);
  }
  const canApplyPhotoItems = (message: Message) => trip.saved.length > 0 || (message.photoItems || []).filter(item => item.state === 'verified').every(item => Boolean(item.fact.date));
  async function send(value = input) {
    const originalText = value.trim();
    setWorkspaceTab('conversation');
    if (busy || voice.listening || photoPreparing) return;
    if (photo) { await sendPhoto(value, photo); return; }
    if (!originalText) return;
    if (!starterDone) finishStarter();
    if (/^(?:내 |현재 )?(?:여행|일정)(?:을|이)?\s*(?:점검|검토)(?:해\s*줘|해|하기|해줘요|해주세요)?[.!?]?$/u.test(originalText)) {
      setInput(''); setReviewTrip(true); setReviewHours(false); follow.current = true;
      setMessages(current => [...current, { id: ++messageId.current, role: 'user', text: originalText }]);
      append('시간·휴식·귀가 점검 결과입니다.');
      return;
    }
    if (/한\s*번에\s*(하나|한\s*가지)|하나씩.*(도와|질문|안내)/.test(originalText) && !guide) {
      const next = startNaruGuide({ region: plan.region, start: trip.travelStart, end: trip.travelEnd, selected: plan.selected, revision });
      setGuide(next); setInput(''); append(next.question); return;
    }
    if (guide) {
      setInput(''); setMessages(current => [...current, { id: ++messageId.current, role: 'user', text: originalText }]);
      if (originalText === '처음부터 다시') { const next = startNaruGuide({ region: plan.region, start: trip.travelStart, end: trip.travelEnd, selected: plan.selected, revision }); setGuide(next); append(next.question); return; }
      if (guide.step === 'review' && (originalText === '이 조건으로 찾기' || acceptsPendingChange(originalText))) {
        if (guide.revision !== liveRevision.current) { setGuide(null); append('그동안 여행 조건이 바뀌었어요. 현재 내용으로 다시 시작해 주세요.'); return; }
        if (trip.saved.length && (guide.region !== plan.region || guide.start !== trip.travelStart || guide.end !== trip.travelEnd)) { setGuide(null); append('담아둔 일정이 있어요. 기존 여행을 보존하며 날짜·지역 변경 도구에서 변경 내용을 확인해 주세요.'); openTool(guide.region !== plan.region ? 'conditions' : 'dates'); return; }
        if (guide.start && guide.start !== trip.travelStart || guide.end && guide.end !== trip.travelEnd) {
          const receipt = trip.applyTripCommand({ type: 'schedule', start: guide.start, end: guide.end }, known);
          if (!receipt.ok) { append(receipt.reason); return; }
          append(receipt.label, { receipt });
        }
        const criteria = guide; setGuide(null); setBusy(true);
        const searchId = ++sequence.current;
        try { const result = await props.onSearch({ region: criteria.region, profiles: criteria.selected });
          if (searchId !== sequence.current) return;
          if (result) { shownPlaces.current = result.places; append(result.places.length ? '조건을 유지해 찾은 여행지예요. 원하는 장소를 담아주세요.' : '확인된 후보가 없어요. 편의는 유지하고 다른 지역이나 활동을 찾아볼 수 있어요.', { results: [...result.places, ...(result.explorationPlaces || [])], evidenceKeys: resolveFacilityKeys({ profiles: criteria.selected }), evidenceRegion: criteria.region }); }
          else append('여행지를 불러오지 못했어요. 조건은 유지했습니다.');
        } catch { if (searchId === sequence.current) append('여행지를 불러오지 못했어요. 조건은 유지했습니다.'); } finally { if (searchId === sequence.current) setBusy(false); }
        return;
      }
      const next = advanceNaruGuide(guide, originalText); setGuide(next); append(next?.question || '한 가지씩 안내를 끝냈어요. 여행은 변경하지 않았어요.'); return;
    }
    const referencePlaces = /일정(?:의|에서|에\s*(?:있는|담긴|저장된))|담아?\s*둔|담은|방문\s*순서/.test(originalText) ? trip.orderedSavedPlaces : shownPlaces.current.length ? shownPlaces.current : trip.orderedSavedPlaces;
    const helpReference = resolveConversationReference(originalText, referencePlaces, focusedPlace.current);
    const localHelp = naruLocalHelp(originalText);
    if (localHelp) {
      setInput(''); setMessages(current => [...current, { id: ++messageId.current, role: 'user', text: originalText }]);
      if (localHelp === 'help') { setToolsOpen(true); append('시설 확인, 일정 변경, 문의 카드와 공유를 도와드려요. 아래 여행 도구를 고르거나 사용 예시를 눌러보세요.'); }
      else { if (helpReference.unresolved) { append('어느 장소인지 이름이나 번호를 알려주세요.'); return; } openTool(localHelp, helpReference.placeId || ''); append(localHelp === 'transcript' ? '소리를 재생하지 않고 해설 대본을 읽을 수 있어요.' : localHelp === 'preview' ? '일정에 담은 장소의 주차·입구·시설을 차례로 살펴보세요.' : localHelp === 'inquiry' ? '직원에게 보여줄 질문을 큰 글자로 준비할 수 있어요.' : '현재 장소의 시설 정보를 함께 비교해보세요. 정보가 없는 항목은 미확인으로 남겨둡니다.'); }
      return;
    }
    if (/취소|하지\s*마|하지\s*말/.test(originalText) && !/되돌|실행\s*취소/.test(originalText)) { setInput(''); setMessages(current => [...current.map(message => message.applied ? message : { ...message, cancelled: true }), { id: ++messageId.current, role: 'user', text: originalText }]); append('제안을 취소했어요. 일정은 변경하지 않았어요.'); inputRef.current?.focus({ preventScroll: true }); return; }
    const reference = resolveConversationReference(originalText, referencePlaces, focusedPlace.current);
    const text = reference.text;
    if (reference.unresolved) { append('어느 장소인지 이름이나 목록의 번호를 알려주세요.'); return; }
    const latestReply = [...messages].reverse().find(message => message.role === 'assistant');
    const pending = latestReply && !latestReply.applied && !latestReply.cancelled && (latestReply.draft || latestReply.proposal) ? latestReply : null;
    if (acceptsPendingChange(text) && pending) {
      setInput(''); setMessages(current => [...current, { id: ++messageId.current, role: 'user', text: originalText }]);
      if (pending.draft) applyDraft(pending); else await apply(pending);
      return;
    }
    const clarification = naruEditClarification(text);
    if (clarification) { setInput(''); setMessages(current => [...current, { id: ++messageId.current, role: 'user', text: originalText }]); append(clarification); return; }
    const direct = naruDirectCommand(text, known);
    if (direct) {
      setInput(''); setMessages(current => [...current, { id: ++messageId.current, role: 'user', text: originalText }]);
      await apply({ id: ++messageId.current, role: 'assistant', text: '', proposal: direct, revision }); return;
    }
    setInput(''); follow.current = true;
    const recent = [...messages.filter(message => !['local-vision', 'photo-input'].includes(message.source || '')).slice(-5).map(message => ({ role: message.role, content: message.text })), { role: 'user', content: text }];
    setMessages(current => [...current.slice(-29), { id: ++messageId.current, role: 'user', text: originalText }]);
    const id = ++sequence.current;
    const control = new AbortController(); request.current = control; setBusy(true);
    const timer = setTimeout(() => control.abort(), 48000);
    let journeyStarted = false;
    const progress = (phase: string, text: string) => { if (id !== sequence.current) return; const next = { phase, text }; setActivity(next); props.onActivity(next); };
    progress('thinking', '나루가 여행 요청을 이해하고 있어요.');
    try {
      const response = await fetch('/api/assistant', { method: 'POST', credentials: 'same-origin', signal: control.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: recent, context: { tone, page: props.pageContext || '여행 설계', region: plan.region, profiles: plan.selected, guidancePreferences: props.guidance.value, comfort: trip.comfort, themes: plan.theme, days: trip.tripDays, transport: props.transport, savedIds: trip.saved, resultIds: shownPlaces.current.map(place => place.id), focusedPlaceId: focusedPlace.current, places: known.map(({ id, name, city }) => ({ id, name, city })) } }) });
      if (response.status === 429) { if (id === sequence.current) { setInput(current => current || text); append('나루가 다른 답변을 마무리하고 있어요. 질문은 입력창에 남겨두었으니 잠시 뒤 다시 보내주세요. 여행 도구는 바로 사용할 수 있어요.'); progress('warning', '잠시 뒤 질문을 다시 보내주세요.'); } return; }
      if (!response.ok) throw new Error('unavailable');
      let data;
      if (isNaruStream(response)) {
        const outcome = await readNaruStream(response, value => setStreamText(current => id === sequence.current ? current + value : current));
        if (id !== sequence.current) return;
        setStreamText('');
        if (!outcome.done) {
          markConnected();
          const partial = outcome.text.trim();
          if (partial) append(partial.slice(0, 500), { source: 'local-llm' });
          append('답변이 끊겼어요. 다시 물어봐 주세요.');
          progress('warning', '답변이 끊겼어요. 다시 물어봐 주세요.');
          return;
        }
        data = { reply: outcome.reply, proposal: outcome.proposal, source: outcome.source };
      } else data = await response.json();
      if (id !== sequence.current) return;
      markConnected();
      const proposal = validateAssistantAction(data.proposal, known.map(place => place.id));
      if (reference.placeId) setFocused(reference.placeId);
      if (proposal && isChangeNegated(text) && !['search','details','readiness','compare','next','tool','help'].includes(proposal.action)) { append('일정은 변경하지 않았어요. 원하는 내용을 더 알려주세요.'); return; }
      if (proposal && ['create-itinerary', 'adapt-itinerary'].includes(proposal.action)) {
        if (!proposal.start && !trip.travelStart) { append('언제 여행할까요? 날짜를 알려주시면 일정안을 만들게요. 날짜 없이 여행지만 찾아볼 수도 있어요.'); return; }
        journeyStarted = true;
        progress('searching', '실제 관광 데이터를 확인하고 있어요.');
        const prepared = await requestNaruJourney(proposal, { region: plan.region, profiles: plan.selected, themes: plan.themes, start: trip.travelStart, end: trip.travelEnd, transport: props.transport,
          stops: trip.orderedSavedPlaces.map(place => ({ id: place.id, date: trip.scheduleAssignments[place.id] || trip.tripDays[0], fixed: Boolean(trip.fixedVisits[place.id]) })) }, control.signal, progress);
        if (id !== sequence.current) return;
        const draft = { ...prepared, stops: prepared.stops.map(stop => stop.replaces ? { ...stop, minutes: trip.visitMinutesByPlaceId[stop.replaces] ?? stop.minutes, breakMinutes: Math.max(trip.breakMinutesByPlaceId[stop.replaces] ?? 0, stop.breakMinutes) } : stop) };
        const unchanged = draft.outcome?.kind === 'unchanged';
        append(unchanged ? '현재 장소 모두 공식 소개에서 실내 공간을 확인했어요. 기존 일정을 그대로 유지했어요.' : draft.stops.length || draft.restOnly ? '실제 관광 정보로 일정안을 준비했어요. 확인할 편의와 변경 내용을 살펴보고 적용해 주세요.' : '조건을 유지하며 찾아봤지만 바로 적용할 일정안을 만들지 못했어요. 아래에서 다음 방법을 골라주세요.', { source: 'AI 요청 · 공공 관광 데이터', draft, revision });
        progress(unchanged || draft.stops.length || draft.restOnly ? 'done' : 'warning', unchanged ? '실내 정보를 확인했어요. 기존 일정은 그대로예요.' : draft.restOnly ? '나루가 휴식과 방문 조정안을 준비했어요.' : draft.stops.length ? `나루가 ${draft.stops.length}곳의 일정안을 준비했어요.` : '나루가 찾은 결과와 다음 방법을 확인해 주세요.');
        return;
      }
      if (proposal && canRunConversationAction(text, proposal, reference.placeId || '', known)) {
        await apply({ id: ++messageId.current, role: 'assistant', text: '', proposal, revision }, true);
      } else if (proposal) append('이렇게 변경할까요?', { proposal, revision });
      else append(typeof data.reply === 'string' ? data.reply.slice(0, 500) : '요청을 조금 더 구체적으로 알려주세요.');
      progress('done', '나루의 답변이 도착했어요.');
    } catch {
      if (id !== sequence.current) return;
      if (journeyStarted) { setInput(current => current || text); append('관광 정보를 확인하는 중 연결이 끊겼어요. 기존 일정은 그대로 있으니 다시 요청하거나 여행 도구로 계속해 주세요.'); progress('warning', '일정 준비를 마치지 못했어요. 다시 시도할 수 있어요.'); return; }
      const proposal = localAssistantAction(text, known);
      if (proposal.action !== 'help' && canRunConversationAction(text, proposal, reference.placeId || '', known)) {
        append('AI 연결이 원활하지 않아 간편 명령으로 처리할게요.');
        await apply({ id: ++messageId.current, role: 'assistant', text: '', proposal, revision }, true, true);
      } else { setInput(current => current || originalText); append('연결하지 못했어요. 입력한 내용은 남겨두었어요. 잠시 뒤 다시 보내주세요.'); }
      progress('warning', '연결을 확인해 주세요. 여행 도구는 사용할 수 있어요.');
    } finally { clearTimeout(timer); if (id === sequence.current) { setBusy(false); setStreamText(''); request.current = null; } }
  }
  function title(action: AssistantAction) {
    if (action.action === 'set-dates') return `${action.start} – ${action.end} 여행 기간`;
    if (action.action === 'recalculate-route') return action.transport ? `${transportLabels[action.transport]} 이동 경로 확인 · 기존 일정 유지` : '현재 순서로 이동 경로 다시 확인';
    if (action.action === 'save-trip') return '내 여행에 저장';
    const name = known.find(place => place.id === action.placeId)?.name || '';
    const titles: Record<string, string> = { settings: [action.region, action.profiles?.map(id => profiles.find(p => p.id === id)?.label).join(' · '), action.themes?.map(id => themes.find(t => t.id === id)?.label).join(' · ')].filter(Boolean).join(' / '), search: '현재 조건으로 여행지 찾기', add: `${name} 일정에 담기`, remove: `${name} 일정에서 빼기`, details: `${name} 이용 정보`, move: `${name} ${action.direction === 'up' ? '앞' : '뒤'}으로 이동`, visit: `${name} 체류 ${action.minutes}분`, break: `${name} 휴식 ${action.minutes}분`, day: `${action.date} 일정 보기`, 'start-time': `${action.time}에 출발`, deadline: `${action.time}까지 귀가`, readiness: '출발 전 확인할 것 정리', compare: '현재 장소의 편의 비교', alternatives: `${name} 대안 비교`, next: '다음 미방문 장소', undo: '마지막 변경 되돌리기', tool: toolLabel(action.tool || ''), help: '여행 도구 보기' };
    return titles[action.action] || '작업 확인';
  }
  function applyDraft(message: Message) {
    if (busy || message.applied || message.cancelled || executed.current.has(message.id) || !message.draft || message.draft.outcome?.kind === 'unchanged') return;
    if (message.revision !== liveRevision.current) { append('그동안 여행이 바뀌었어요. 현재 내용으로 다시 요청해 주세요.'); return; }
    executed.current.add(message.id);
    const error = trip.applyJourneyDraft(message.draft);
    if (error) { executed.current.delete(message.id); append(error); return; }
    const draft = message.draft;
    plan.setRegion(draft.region); plan.setSelected(draft.profiles); plan.setTheme(draft.themes.join(','));
    plan.acceptPreparedPlan(draft.plan, draft);
    journeyUndo.current = { region: plan.region, themes: plan.themes, profiles: plan.selected, criteria: JSON.stringify([draft.region, draft.themes, draft.profiles]), route: props.onJourneyApplied(draft) };
    setMessages(current => current.map(item => item.id === message.id ? { ...item, applied: true } : item));
    append(draft.restOnly ? '방문 수와 쉬는 시간을 조정했어요. 고정 방문과 기존의 긴 휴식은 유지했습니다.' : `${draft.stops.length}곳의 날짜·순서·체류·휴식을 반영했어요. 지도와 실제 이동시간을 이어서 확인하고, 원하는 곳은 직접 수정할 수 있어요.`);
    setReviewHours(true);
    setActivity({ phase: 'done', text: '내 일정에 반영했어요. 지도와 이동 경로를 확인하고 있어요.' });
    props.onActivity({ phase: 'done', text: '내 일정에 반영했어요. 지도에서 이동 정보를 확인할 수 있어요.' });
  }
  function undoJourney() {
    const snapshot = journeyUndo.current;
    if (!snapshot) return false;
    if (snapshot.criteria !== JSON.stringify([plan.region, plan.themes, plan.selected]) || snapshot.route.revision !== props.routeRevision || !trip.undoJourneyDraft()) {
      append('적용 뒤 여행이 바뀌었거나 저장하지 못했어요. 현재 여행을 보존했으니 일정에서 확인해 주세요.'); return true;
    }
    plan.setRegion(snapshot.region); plan.setTheme(snapshot.themes.join(',')); plan.setSelected(snapshot.profiles);
    snapshot.route.undo(); journeyUndo.current = null;
    append('적용 전 장소·날짜·시간·휴식과 편의 조건·출발지·이동수단을 복원했어요.');
    return true;
  }
  async function apply(message: Message, automatic = false, navigateTool = false) {
    if ((!automatic && busy) || message.applied || message.cancelled || executed.current.has(message.id) || !message.proposal) return;
    if (message.revision !== liveRevision.current) { append('그동안 여행이 바뀌었어요. 현재 내용으로 다시 요청해 주세요.'); return; }
    const action = validateAssistantAction(message.proposal, known.map(place => place.id));
    if (!action) { append('이 장소나 요청을 지금 처리할 수 없어요. 다시 확인해 주세요.'); return; }
    executed.current.add(message.id);
    const committed = () => setMessages(current => current.map(item => item.id === message.id ? { ...item, applied: true } : item));
    const place = known.find(place => place.id === action.placeId);
    follow.current = true;
    const command = (change: TripCommand) => {
      const result = trip.applyTripCommand(change, known);
      if (!result.ok) { executed.current.delete(message.id); append(result.reason); return false; }
      committed(); append(result.label, { receipt: result }); setReviewHours(true); return true;
    };
    if (action.action === 'tool' || action.action === 'save-trip') {
      const tool = action.action === 'save-trip' ? 'save' : action.tool || 'conditions';
      committed();
      // An offline command is already an explicit request such as “날씨
      // 보여줘”, so complete that reversible navigation immediately. Connected
      // model suggestions remain reviewable as a card in the conversation.
      if (navigateTool && action.action === 'tool') goToTool(tool); else openTool(tool);
      return;
    }
    if (action.action === 'recalculate-route') {
      if (action.transport && action.transport !== props.transport) { command({ type: 'schedule', transport: action.transport }); return; }
      props.onActivity({ phase: 'routing', text: '이동 구간을 확인하고 있어요.' });
      try { await props.onRecalculate(); committed(); append('조회한 이동 구간을 지도에서 볼 수 있어요. 조회되지 않은 구간은 따로 표시했어요.'); }
      catch { executed.current.delete(message.id); append('경로를 불러오지 못했어요. 다시 시도해 주세요.'); }
      return;
    }
    if (action.action === 'set-dates') { command({ type: 'schedule', start: action.start, end: action.end, ...(action.transport ? { transport: action.transport } : {}) }); return; }
    if (action.action === 'help') { setToolsOpen(true); append('필요한 기능을 골라주세요.'); committed(); return; }
    if (action.action === 'settings' || action.action === 'search') {
      const id = sequence.current;
      if (!automatic) setBusy(true);
      setActivity({ phase: 'searching', text: '여행지를 찾고 있어요.' });
      try {
        const result = await props.onSearch(action.action === 'settings' ? { region: action.region, profiles: [...new Set([...plan.selected, ...resolveFacilityKeys({ profiles: action.profiles || [] })])], themes: action.themes } : undefined);
        if (id !== sequence.current) return;
        if (!result) { executed.current.delete(message.id); append('검색을 마치지 못했어요. 같은 조건으로 다시 찾아달라고 말씀해 주세요.'); return; }
        const displayed = [...result.places, ...(result.explorationPlaces || [])].filter(place => !action.region || action.region === '경남 전체' || place.city.includes(action.region)).slice(0, action.count || 24);
        committed(); shownPlaces.current = displayed;
        const partial = result.statuses.some(status => status.state === 'error' || status.partial);
        const excludedNote = result.excludedPlaces?.length ? ` 선택한 시설이 없어 제외된 장소가 ${result.excludedPlaces.length}곳 있어요. 검색 결과에서 제외 이유를 확인할 수 있어요.` : '';
        append((result.places.length ? `현재 불러온 후보 중 ${displayed.length}곳을 찾았어요.${partial ? ' 일부 정보는 아직 불러오지 못했어요.' : ''}` : partial ? '일부 관광 정보를 불러오지 못했어요. 조건은 유지하고 다시 시도할 수 있어요.' : result.explorationPlaces?.length ? '필요한 편의가 모두 확인된 곳은 없어요. 시설 정보가 부족한 후보를 자세히 볼 수 있어요.' : '조건에 맞는 후보가 없어요. 필요한 편의는 유지하고 다른 활동이나 지역을 찾아볼 수 있어요.') + excludedNote, { results: displayed, resultKey: JSON.stringify(result.criteria), evidenceKeys: result.criteria?.facilityKeys?.length ? resolveFacilityKeys({ facilityKeys: result.criteria.facilityKeys }) : resolveFacilityKeys({ profiles: plan.selected }), evidenceRegion: action.action === 'settings' && action.region ? action.region : plan.region });
      } finally { if (!automatic && id === sequence.current) setBusy(false); }
      return;
    }
    if (['add','remove'].includes(action.action) && place) {
      if (action.action === 'add' && (!plan.resultCurrent || !plan.plan?.places.some(p => p.id === place.id))) { executed.current.delete(message.id); append('필요한 시설 정보와 현재 검색 조건을 확인해 주세요.'); props.onPlace(place); return; }
      setFocused(place.id); command({ type: action.action as 'add'|'remove', id: place.id }); return;
    }
    if (action.action === 'undo') {
      if (trip.canUndoCommand) { append(trip.undoCommand() ? '변경을 되돌렸어요.' : '이후에 일정이 바뀌어 되돌리지 못했어요.'); committed(); return; }
      if (undoJourney()) { committed(); return; }
      if (props.canUndoAlternative) append(props.onUndoAlternative() ? '장소 교체를 되돌렸어요.' : '이후에 일정이 바뀌어 되돌리지 못했어요.');
      else append('되돌릴 변경이 없어요.');
      return;
    }
    if (action.action === 'details' && place) { committed(); props.onPlace(place); return; }
    if (action.action === 'alternatives' && place) {
      if (!trip.saved.includes(place.id)) { append('다른 장소로 바꾸려면 이 장소를 일정에 담아주세요. 후보들의 편의를 비교할 수도 있어요.'); openTool('compare'); return; }
      props.onAlternative(place.id); return;
    }
    if (['move','visit','break'].includes(action.action) && place) {
      command(action.action === 'move' ? { type: 'move', id: place.id, direction: action.direction! } : { type: 'stop', id: place.id, ...(action.action === 'visit' ? { minutes: action.minutes! } : { breakMinutes: action.minutes!, ...(action.purpose ? { purpose: action.purpose } : {}) }) }); return;
    }
    if (action.action === 'day') { if (!trip.tripDays.includes(action.date!)) { append('여행 기간 안의 날짜를 알려주세요.'); return; } trip.setActiveDay(action.date!); committed(); openTool('itinerary'); return; }
    if (action.action === 'start-time') { command({ type: 'schedule', startTime: action.time! }); return; }
    if (action.action === 'deadline') { command({ type: 'deadline', day: trip.activeDay, value: { time: action.time!, returnMinutes: trip.dayDeadlines[trip.activeDay]?.returnMinutes ?? null, bufferMinutes: trip.dayDeadlines[trip.activeDay]?.bufferMinutes ?? 20 } }); return; }
    if (action.action === 'compare') { committed(); openTool('compare'); return; }
    if (action.action === 'readiness') { committed(); setShowEvidence(true); append('현재 확인한 장소별 편의 근거를 모았어요. 미확인 항목은 방문 전에 확인해 주세요.'); return; }
    if (action.action === 'next') {
      const daily = trip.orderedSavedPlaces.filter(place => (trip.scheduleAssignments[place.id] || trip.tripDays[0]) === trip.activeDay);
      try { const identity = onTripIdentity(daily, trip.activeDay); const remembered = trip.progressMemory[identity]; const progress = remembered?.unsaved ? remembered.value : readOnTrip(localStorage, identity, daily.map(place => place.id), true); const next = daily.find(place => !progress.marks[place.id]); if (next) { append(`다음 장소는 ${next.name}예요. 방문 완료나 건너뛰기는 여행 당일 안내에서 표시할 수 있어요.`); props.onPlace(next); } else append('이 날짜에 남은 장소가 없어요. 날짜와 방문 기록을 확인해 주세요.'); } catch { append('방문 기록을 읽지 못했어요. 여행 당일 안내에서 확인해 주세요.'); } return;
    }
  }
  function focusPrompt(text: string) {
    setWorkspaceTab('conversation'); setInput(text);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function loadWorkspace(workspace: NaruWorkspace, discard = false) {
    if (busy || photoPreparing || voice.listening) return;
    try { assertTripStorageOwner(localStorage); if (tripStorageFailed(localStorage)) throw new Error('현재 여행에 저장하지 못한 변경이 있어요. 여행 설계에서 먼저 확인해 주세요.'); }
    catch (error) { setWorkspaceNotice(error instanceof Error ? error.message : '현재 여행을 확인해 주세요.'); return; }
    if (!discard && (photo || input.trim() && input !== workspace.input || messages.some(message => message.role === 'user') && JSON.stringify(messages.map(({ role, text }) => ({ role, text }))) !== JSON.stringify(workspace.messages))) { setPendingResume(workspace); setWorkspaceTab('saved'); return; }
    setPendingResume(null);
    const identity = readTripIdentity(localStorage);
    if (identity?.id !== workspace.tripId) {
      const book = savedTravelBooks.find(item => item.tripId === workspace.tripId && item.id === workspace.bookId);
      if (workspace.bookId && !book) { setWorkspaceNotice('연결된 일정 저장본이 없어요. 현재 여행은 그대로 두었습니다.'); return; }
      try { sessionStorage.setItem('wave-naru-resume', workspace.id); workspaceNavigation.current = true; }
      catch { setWorkspaceNotice('이어가기 정보를 준비하지 못했어요. 현재 여행은 그대로입니다.'); return; }
      if (!workspace.bookId) {
        try {
          replaceTripWithBackup(localStorage, { ...emptyTrip('', '', ''), [TRIP_IDENTITY_KEY]: JSON.stringify({ version: 1, id: workspace.tripId, binding: null, share: null }) });
          saveSessionProfiles(getTabStorage(), []); window.location.assign('/planner');
        } catch { workspaceNavigation.current = false; sessionStorage.removeItem('wave-naru-resume'); setWorkspaceNotice('여행을 열지 못했어요. 기존 여행은 유지됩니다.'); }
        return;
      }
      if (!book || !restore(book)) { workspaceNavigation.current = false; sessionStorage.removeItem('wave-naru-resume'); setWorkspaceNotice('여행을 열지 못했어요. 기존 여행은 유지됩니다.'); }
      return;
    }
    cancelRequest(); setGuide(null); setWorkRequestOpen(false); setPhoto(null); setReviewTrip(false); setReviewHours(false); setShowEvidence(false);
    shownPlaces.current = []; setFocused(''); journeyUndo.current = null; executed.current.clear();
    setMessages(workspace.messages.map(message => ({ ...message, id: ++messageId.current })));
    setInput(workspace.input || ''); setWorkspaceTitle(workspace.title); setWorkspaceTab('conversation'); finishStarter();
    setWorkspaceNotice('저장한 대화를 이어갑니다. 예전 변경안은 다시 요청해 현재 정보로 확인해 주세요.');
    setActivity({ phase: 'idle', text: '' }); setStreamText(''); loadedWorkspace.current = workspace.id;
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  useEffect(() => {
    if (!props.open || !trip.storageReady) return;
    const frame = requestAnimationFrame(() => {
      const result = readNaruWorkspaces(localStorage);
      if (result.ok) setWorkspaces(result.workspaces); else setWorkspaceNotice('저장한 대화를 읽지 못했어요. 현재 대화는 계속할 수 있습니다.');
    });
    return () => cancelAnimationFrame(frame);
  }, [props.open, trip.storageReady]);
  // The departing document must not consume the next document's resume intent.
  useEffect(() => {
    if (workspaceNavigation.current || !props.open || !trip.storageReady) return;
    let resume = ''; try { resume = sessionStorage.getItem('wave-naru-resume') || ''; } catch { return; }
    if (resume === 'new') {
      const frame = requestAnimationFrame(() => { if (workspaceNavigation.current) return; sessionStorage.removeItem('wave-naru-resume'); finishStarter(); setWorkRequestOpen(true); });
      return () => cancelAnimationFrame(frame);
    }
    const workspace = workspaces.find(item => item.id === resume && item.tripId === readTripIdentity(localStorage)?.id);
    if (!workspace || loadedWorkspace.current === workspace.id) return;
    const frame = requestAnimationFrame(() => { if (workspaceNavigation.current) return; sessionStorage.removeItem('wave-naru-resume'); loadWorkspace(workspace, true); });
    return () => cancelAnimationFrame(frame);
  });
  function saveWorkspace() {
    if (busy || !trip.storageReady) return false;
    try {
      assertTripStorageOwner(localStorage);
      if (tripStorageFailed(localStorage)) { setWorkspaceNotice('현재 여행에 저장하지 못한 변경이 있어요. 여행 설계에서 저장을 다시 확인해 주세요.'); return false; }
      const identity = ensureTripIdentity(localStorage);
      const title = workspaceTitle.trim() || `${plan.region || '경남'} 여행`;
      let bookId: string | undefined;
      if (trip.saved.length) {
        const book = archive({ title, tripId: identity.id, identity, region: plan.region, themes: plan.themes, theme: plan.theme,
          profiles: plan.selected, guidancePreferences: props.guidance.value,
          travelStart: trip.travelStart, travelEnd: trip.travelEnd, dayStartTime: trip.dayStartTime, travelMode: props.transport,
          places: trip.orderedSavedPlaces, scheduleAssignments: trip.scheduleAssignments, comfort: trip.comfort,
          visitMinutesByPlaceId: trip.visitMinutesByPlaceId, breakMinutesByPlaceId: trip.breakMinutesByPlaceId,
          restPurposeByPlaceId: trip.restPurposeByPlaceId, fixedVisits: trip.fixedVisits, dayDeadlines: trip.dayDeadlines });
        if (!book) { setWorkspaceNotice('일정을 저장하지 못했어요. 현재 대화와 여행은 유지됩니다.'); return false; }
        bookId = book.id;
      }
      const result = saveNaruWorkspace(localStorage, { tripId: identity.id, title, bookId, messages: messages.map(({ role, text, source }) => ({ role, text, source })), input });
      if (!result.ok) { setWorkspaceNotice(result.error === 'limit' ? '여행 작업은 최대 10개까지 저장할 수 있어요. 필요 없는 대화 기록을 정리한 뒤 다시 저장해 주세요.' : trip.saved.length ? '일정은 여행집에 저장했지만 대화는 저장하지 못했어요. 현재 대화는 유지됩니다.' : '대화를 저장하지 못했어요. 현재 대화는 유지됩니다.'); return false; }
      setWorkspaces(result.workspaces); setWorkspaceTitle(title);
      setWorkspaceNotice(trip.saved.length ? '이 기기에 대화와 일정을 저장했어요.' : '이 기기에 대화를 저장했어요. 다음에 열어 여행 준비를 이어갈 수 있어요.');
      return true;
    } catch (error) { setWorkspaceNotice(error instanceof Error ? error.message : '저장 공간을 확인해 주세요. 현재 대화와 여행은 유지됩니다.'); return false; }
  }
  const reviewedVisits = reviewHours ? buildItinerarySchedule({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, startTime: trip.dayStartTime, origin: props.origin, routeMinutesByPlaceId: props.routeMinutes, visitMinutesByPlaceId: trip.visitMinutesByPlaceId, breakMinutesByPlaceId: trip.breakMinutesByPlaceId, fixedVisits: trip.fixedVisits }).flatMap(day => day.entries.map(entry => ({ place: entry.place, day: day.day, startsAt: entry.startsAt, endsAt: entry.visitEndsAt, travelSource: entry.travelSource }))) : [];
  // Keep tool hosts mounted so closing Naru does not discard unsaved tool input.
  const todayKey = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })();
  const hubContext = { hasItinerary: Boolean(trip.travelStart), isTripDay: trip.tripDays.includes(todayKey), hasFocusedPlace: Boolean(focusedPlaceId), hasSavedTrip: savedTravelBooks.length > 0 };
  const priorityFacilityLabels = FACILITIES.filter(item => ['route', 'elevator', 'audioguide', 'bigprint', 'signguide'].includes(item.key) && plan.selected.includes(item.key)).map(item => item.label);
  const guidanceSummary = [...guidancePreferenceText(props.guidance.value), ...priorityFacilityLabels];
  // 확인·미확인 개수와 항목별 상태는 장소 응답에서만 계산한다. 모델 출력에서
  // 숫자나 상태를 파싱하지 않는다. 사용자가 편의 조건을 고르지 않았거나 응답에
  // 편의 정보가 없으면 기준이 없으므로 표시하지 않는다.
  const evidence = new Map(messages.flatMap(message => {
    if (!message.results) return [];
    const facilityKey = weakestFacility(message.results, message.evidenceKeys || []);
    if (!facilityKey) return [];
    return [[message.id, { facilityKey, tally: tallyEvidence(message.results, facilityKey), groups: groupByEvidence(message.results, facilityKey) }] as const];
  }));
  const resultRow = (place: Place, facilityKey: string | null, label: string) => <article key={place.id}><button type="button" className="naru-place-name" onClick={() => { setFocused(place.id); if (log.current) scrollPosition.current = log.current.scrollTop; props.onPlace(place); }}>{place.name}</button><small>{place.city}</small>{facilityKey && <span className="access-badge" data-evidence-state={placeFacilityState(place, facilityKey)}>{evidenceStateText(placeFacilityState(place, facilityKey), label)}</span>}{plan.resultCurrent && plan.plan?.places.some(item => item.id === place.id) ? <button type="button" disabled={trip.saved.includes(place.id)} onClick={() => void apply({ id: ++messageId.current, role: 'assistant', text: '', proposal: { action: 'add', placeId: place.id }, revision })}>{trip.saved.includes(place.id) ? '✓ 담았음' : '담기'}</button> : <button type="button" onClick={() => props.onPlace(place)}>시설 정보 확인</button>}</article>;
  return <dialog ref={dialogRef} lang="ko" className={`naru-panel naru-workspace naru-${size}`} aria-label="WAVE 여행 가이드 나루와 대화" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
    // React portal children handle Escape first (for example a draft editor).
    if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]:not(.naru-panel)')) return;
    event.preventDefault(); event.stopPropagation(); close();
  }} >
    <div className="naru-conversation">
      <div className="naru-heading">
        <NaruAvatar state={busy ? activity.phase : 'idle'} />
        <div><strong>나루</strong><small>{available ? '여행을 함께 설계하는 AI' : checking || available === null ? <><Spinner />연결 확인 중</> : '여행 도구로 계속할 수 있어요'}</small></div>
        <div className="naru-heading-actions">
          <button type="button" aria-label="저장한 여행 작업 열기" onClick={() => setWorkspaceTab('saved')}><NaruWorkspaceIcon name="history" /></button>
          <button type="button" className="naru-support-toggle" aria-expanded={starterOpen} aria-controls="naru-support-picker" onClick={() => starterOpen && !starterDone ? confirmStarter(true) : toggleStarter()}>{starterOpen ? '도움 닫기' : '맞춤 도움'}</button>
          <button type="button" className="naru-size-toggle" onClick={() => setSize(current => { const next = current === 'compact' ? 'large' : 'compact'; try { localStorage.setItem('wave-naru-size-v1', next); } catch { /* no-op */ } return next; })} aria-label={size === 'compact' ? '대화창 크게 보기' : '대화창 작게 보기'}><NaruWorkspaceIcon name={size === 'compact' ? 'expand' : 'compact'} /></button>
          <details className="naru-more"><summary aria-label="나루 메뉴">•••</summary><div>      <p className="naru-note" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span>지금 안내 방식: {guidanceSummary.length ? guidanceSummary.join(' · ') : '기본 방식'}</span>
        <button type="button" style={{ minHeight: '44px' }} onClick={() => goToTool('facilities')}>바꾸기</button>
      </p>
<a href="/guide#naru-guide" onClick={close}>사용 방법</a>{speaking && <button type="button" onClick={() => { speechSynthesis.cancel(); setSpeaking(false); }}>읽기 중단</button>}<p>대화와 사진은 AI 서버에서 처리하지만 서버에 보관하지 않아요. 저장을 누른 대화는 이 기기에 보관되며 사진 원본은 저장하지 않습니다. 사진은 위치정보를 제거한 뒤 보냅니다.</p></div></details>
          <button type="button" onClick={close} aria-label="나루 대화 닫기">×</button>
        </div>
      </div>
      {available === false && <button type="button" className="naru-retry" onClick={recheck} disabled={checking}>연결 다시 확인</button>}
      <nav className="naru-workspace-tabs" aria-label="나루 작업공간" role="tablist" onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const choices = ['conversation', 'tools', 'saved'] as const;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (choices.indexOf(workspaceTab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        setWorkspaceTab(choices[next]); event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
      }}>
        <button type="button" role="tab" id="naru-tab-conversation" aria-controls="naru-panel-conversation" aria-selected={workspaceTab === 'conversation'} tabIndex={workspaceTab === 'conversation' ? 0 : -1} onClick={() => setWorkspaceTab('conversation')}><NaruWorkspaceIcon name="chat" />대화</button>
        <button type="button" role="tab" id="naru-tab-tools" aria-controls="naru-panel-tools" aria-selected={workspaceTab === 'tools'} tabIndex={workspaceTab === 'tools' ? 0 : -1} onClick={() => setWorkspaceTab('tools')}><NaruWorkspaceIcon name="tools" />여행 도구</button>
        <button type="button" role="tab" id="naru-tab-saved" aria-controls="naru-panel-saved" aria-selected={workspaceTab === 'saved'} tabIndex={workspaceTab === 'saved' ? 0 : -1} onClick={() => setWorkspaceTab('saved')}><NaruWorkspaceIcon name="saved" />저장한 내용</button>
      </nav>
      {workspaceNotice && <p className="naru-workspace-notice" role="status">{workspaceNotice}</p>}
      <div role="tabpanel" id="naru-panel-conversation" aria-labelledby="naru-tab-conversation" className="naru-workspace-body" hidden={workspaceTab !== 'conversation'}>
      <div className="naru-conversation-main">
      <div className="naru-log" ref={log} role="log" aria-live="polite" aria-relevant="additions" onScroll={() => { if (log.current) { follow.current = log.current.scrollHeight - log.current.scrollTop - log.current.clientHeight < 100; scrollPosition.current = log.current.scrollTop; } }}>
        {!workRequestOpen && <div className="naru-workspace-actions"><button type="button" disabled={busy || voice.listening || photoPreparing || Boolean(photo)} onClick={() => { finishStarter(); setWorkRequestOpen(true); follow.current = false; }}>여행 준비 맡기기 →</button></div>}
        {workRequestOpen && <NaruWorkRequest region={plan.region} start={trip.travelStart} end={trip.travelEnd} transport={props.transport} disabled={busy || voice.listening || photoPreparing || Boolean(photo)} onClose={() => setWorkRequestOpen(false)} onSubmit={prompt => { setWorkRequestOpen(false); follow.current = true; void send(prompt); }} />}
        {starterOpen && <section id="naru-support-picker" className="naru-starter" aria-labelledby="naru-starter-title"><h2 id="naru-starter-title">{say({ standard: "어떤 도움이 필요할까요?", gyeongnam: "어떤 도움이 필요하신가예?" })}</h2><p>지금 필요한 도움만 추가하세요. 적용한 편의는 여행 조건에서 언제든 다시 바꿀 수 있습니다.</p><div>{starterChoices.map(item => <button type="button" key={item.id} aria-pressed={starterSelected.includes(item.id)} onClick={() => setStarterSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>{starterSelected.includes(item.id) ? '✓ ' : ''}{item.label}</button>)}</div><footer><button type="button" onClick={starterDone ? toggleStarter : () => confirmStarter(true)}>{starterDone ? '닫기' : '건너뛰기'}</button><button type="button" className="primary" disabled={!starterSelected.length} onClick={() => confirmStarter(false)}>선택 적용</button></footer></section>}
        {starterDone && messages.filter(message => message.id !== 0 || !trip.saved.length).map(message => <div key={message.id} id={`naru-reply-${message.id}`} className={`naru-message ${message.role}`}>
          {message.role === 'assistant' && <span className="naru-message-avatar"><NaruAvatar /></span>}
          <p>{message.text}</p>
          {message.role === 'assistant' && message.text && <button type="button" className="naru-readback" aria-label="답변 복사" onClick={() => { void (navigator.clipboard?.writeText(message.text) || Promise.reject(new Error('clipboard-unavailable'))).then(() => setWorkspaceNotice('답변을 복사했어요.'), () => setWorkspaceNotice('복사하지 못했어요. 답변 글자를 선택해 복사해 주세요.')); }}>복사</button>}
          {message.source === 'local-vision' && <p className="naru-note">사진에서 읽은 내용이에요. 맞는지 확인한 뒤 장소와 날짜를 입력해 여행에 반영해 주세요. 일정은 아직 변경하지 않았어요.</p>}
          {message.photoItems && <div className="naru-tool-card" aria-label="사진 내용과 관광정보 대조 결과"><strong>공식 관광정보 대조</strong>{message.photoItems.map((item, index) => <article key={`${item.fact.name}-${index}`}><b>{item.fact.name || '장소명 미확인'}</b><span>{item.state === 'verified' ? ' · 같은 장소 확인' : item.state === 'ambiguous' ? ' · 같은 이름이 여러 곳' : ' · 같은 장소를 찾지 못함'}</span>{item.fact.date && <small>{item.fact.date}{item.fact.startTime ? ` ${item.fact.startTime}` : ''}{item.fact.endTime ? `–${item.fact.endTime}` : ''}</small>}{item.place && <button type="button" onClick={() => props.onPlace(item.place!)}>공식 정보 보기</button>}</article>)}{message.photoItems.some(item => item.state === 'verified') && (canApplyPhotoItems(message) ? <button type="button" disabled={busy || message.applied} onClick={() => applyPhotoItems(message)}>{message.applied ? '일정에 반영됨' : '확인된 장소로 일정안 만들기'}</button> : <button type="button" onClick={() => openTool('dates')}>여행 날짜 먼저 정하기</button>)}<p className="naru-note">사진의 글자는 참고 자료이며, 같은 이름·지역·행사 날짜가 공공데이터와 맞은 장소만 담을 수 있어요.</p></div>}
          {message.source === 'local-vision' && <button type="button" disabled={busy} onClick={() => { setInput(`다음 사진 내용을 확인하고 필요한 부분을 수정해서 여행을 요청할게요: ${message.text}`.slice(0, 1100)); inputRef.current?.focus(); }}>읽은 내용으로 요청 작성</button>}
          {message.role === 'assistant' && message.text && <button type="button" className="naru-readback" onClick={() => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.dispatchEvent(new CustomEvent('wave:audio-start', { detail: { source: 'naru-speech' } })); const utterance = new SpeechSynthesisUtterance([message.text, ...(message.results || []).map((place, index) => `${index + 1}번 ${place.city} ${place.name}`), ...(message.draft?.stops || []).map(stop => `${stop.date}, ${stop.place.name}, ${stop.minutes}분 방문, 휴식 ${stop.breakMinutes}분. ${stop.unknown.length ? `미확인 항목: ${stop.unknown.join(', ')}` : ''}`), ...(message.draft?.warnings || [])].join('. ')); utterance.lang = 'ko-KR'; utterance.onend = utterance.onerror = () => setSpeaking(false); setSpeaking(true); window.speechSynthesis.speak(utterance); } else append('이 브라우저는 읽어주기를 지원하지 않아요. 화면 읽기 프로그램으로 같은 내용을 확인할 수 있어요.'); }}>답변 읽어주기</button>}
          {message.draft && !message.cancelled && <NaruJourneyProposal draft={message.draft} disabled={busy || !message.applied && message.revision !== revision} applied={Boolean(message.applied)} onApply={() => applyDraft(message)} onExplore={() => { if (busy || message.applied || message.revision !== revision) return; plan.setRegion(message.draft!.region); plan.setSelected([...new Set([...plan.selected, ...message.draft!.profiles])]); plan.setTheme(message.draft!.themes.join(',')); plan.acceptPreparedPlan(message.draft!.plan, message.draft!); openTool('conditions'); }} />}
          {message.draft && message.applied && <button type="button" disabled={busy} onClick={() => { if (!undoJourney()) append('되돌릴 일정안이 없어요.'); }}>마지막 일정안 적용 되돌리기</button>}
          {message.proposal && !message.applied && !message.cancelled && <button type="button" className="naru-change-button" disabled={busy || message.revision !== revision} onClick={() => void apply(message)}>{message.revision !== revision ? '일정이 바뀌었어요 · 다시 요청해 주세요' : title(message.proposal)}</button>}
          {message.receipt && <button type="button" className="naru-undo" disabled={busy || message.receipt.afterKey !== trip.voiceRevision} onClick={() => { if (trip.undoCommand(message.receipt)) append('변경을 되돌렸어요.'); else append('이후에 일정이 바뀌어 되돌리지 못했어요.'); }}>되돌리기</button>}
          {/* 근거 표시는 답변이 확정된 뒤에만 그려진다. 도착 중인 글자에는
              붙지 않으므로 요약의 숫자가 스트리밍 도중 바뀌지 않는다. 숫자와
              상태는 전부 lib/naru-evidence.js가 장소 응답에서 계산한 값이며
              모델이 쓴 문장에서 읽지 않는다. */}
          {message.results && evidence.get(message.id) && <p data-evidence-summary="true">{evidenceSentence(evidence.get(message.id)!.tally, message.evidenceRegion || plan.region)}</p>}
          {message.results && <div className="naru-result-list" aria-label="대화에서 찾은 여행지">
            {evidence.get(message.id)
              ? (['confirmed', 'unconfirmed'] as const).map(kind => <div key={kind} role="group" data-evidence-group={kind} aria-label={evidenceGroupTitle(kind, evidence.get(message.id)!.groups[kind].length)}><p><strong>{evidenceGroupTitle(kind, evidence.get(message.id)!.groups[kind].length)}</strong></p>{evidence.get(message.id)!.groups[kind].map(place => resultRow(place, evidence.get(message.id)!.facilityKey, evidence.get(message.id)!.tally.label))}</div>)
              : message.results.map(place => resultRow(place, null, ''))}
            {!message.results.length && <button type="button" onClick={() => openTool('conditions')}>검색 조건 수정</button>}
          </div>}
          {message.toolId && <div className="naru-tool-card"><strong>{toolLabel(message.toolId)}</strong><button type="button" onClick={() => goToTool(message.toolId!)}>{toolSurfaceGroup(message.toolId) ? "나루에서 도구 열기" : "여행 설계에서 자세히 보기"}</button></div>}
        </div>)}
        {starterDone && !starterOpen && !trip.saved.length && messages.length === 1 && <section className="naru-prompt-starters" aria-labelledby="naru-prompt-title"><h2 id="naru-prompt-title">{say(naruGuideTones.promptTitle)}</h2>{starterPrompts.filter((_, index) => index === 0 || index === 4 || (trip.saved.length > 0 && (index === 2 || Boolean(trip.travelStart)))).map(prompt => <button type="button" key={prompt} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}>{prompt}</button>)}</section>}
        {guide && <div className="naru-guided-choices" role="group" aria-label="한 가지씩 안내 선택">{guide.choices.map(choice => <button type="button" key={choice} disabled={busy} onClick={() => void send(choice)}>{choice}</button>)}<button type="button" onClick={() => void send('안내 끝내기')}>안내 끝내기</button></div>}
        {reviewTrip && <Suspense fallback={<LoadingState>여행 점검을 준비하고 있어요.</LoadingState>}><NaruTripReview places={trip.orderedSavedPlaces} days={trip.tripDays} assignments={trip.scheduleAssignments} startTime={trip.dayStartTime} origin={props.origin} routeMinutes={props.routeMinutes} visits={trip.visitMinutesByPlaceId} breaks={trip.breakMinutesByPlaceId} fixed={trip.fixedVisits} deadlines={trip.dayDeadlines} comfort={trip.comfort} onTool={goToTool} onDetails={props.onPlace} onAlternative={props.onAlternative} onRequest={prompt => { setInput(prompt); inputRef.current?.focus(); }} /></Suspense>}
        {reviewHours && !reviewTrip && <Suspense fallback={<LoadingState>바뀐 일정을 확인하고 있어요.</LoadingState>}><NaruScheduleReview key={trip.voiceRevision} visits={reviewedVisits} onAlternative={props.onAlternative} onDetails={props.onPlace} /></Suspense>}
        {showEvidence && <div className="naru-evidence" aria-label="현재 장소의 편의 근거"><EvidenceCoverageCard compact places={trip.orderedSavedPlaces.length ? trip.orderedSavedPlaces : known} requiredKeys={plan.plan?.criteria?.facilityKeys || plan.selected} onCompare={() => openTool("compare")} onAlternatives={() => openTool("alternatives")} />{(trip.orderedSavedPlaces.length ? trip.orderedSavedPlaces : known).map(place => <article key={place.id}><strong>{place.name}</strong><p>{place.accessibility?.map(field => `${field.label}: ${field.state === 'confirmed' ? '확인됨' : field.state === 'negative' ? '조건과 맞지 않음' : '미확인'}`).join(' · ') || '편의 정보 미확인'}</p><small>{place.source || '출처 미제공'} · {place.checkedAt || '조회 시각 미제공'}</small><button type="button" onClick={() => props.onPlace(place)}>원문과 문의 정보</button></article>)}{!known.length && <p>{say(naruGuideTones.evidenceEmpty)}</p>}<button type="button" onClick={() => openTool('readiness')}>날씨·이동까지 확인</button></div>}
        {/* 도착 중인 글자는 화면 낭독기가 끊기지 않도록 읽지 않는다. 완료된 답변만 대화에 추가되어 한 번 알려진다. */}
        {streamText && <div className="naru-message assistant" data-streaming="true">
          <p aria-hidden="true">{streamText}</p>
          <button type="button" className="naru-readback" onClick={() => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.dispatchEvent(new CustomEvent('wave:audio-start', { detail: { source: 'naru-speech' } })); const utterance = new SpeechSynthesisUtterance(streamText); utterance.lang = 'ko-KR'; utterance.onend = utterance.onerror = () => setSpeaking(false); setSpeaking(true); window.speechSynthesis.speak(utterance); } }}>답변 읽어주기</button>
        </div>}
        {busy && <div className="naru-typing" role="status"><Spinner /><span>{activity.text || '나루가 여행을 살펴보고 있어요'}</span></div>}
      </div>
      {toolsOpen && <div className="naru-tools">{toolGroups.map(group => <div key={group.title}><strong>{group.title}</strong><div>{group.items.map(([id, label]) => <button key={id} type="button" onClick={() => openTool(id)}>{label}</button>)}</div></div>)}</div>}
      {starterDone && <div className="naru-context-suggestions" aria-label="현재 여행에서 이어가기">{trip.saved.length > 0 && <p className="naru-trip-context">{plan.region} · 담은 장소 {trip.saved.length}곳{trip.travelStart ? ` · ${trip.travelStart} — ${trip.travelEnd}` : " · 날짜 미정"}</p>}
        {(!props.pageContext || props.pageContext === '여행 설계') && <button type="button" disabled={busy} onClick={() => { setReviewTrip(true); setReviewHours(false); follow.current = true; append('시간·휴식·귀가 점검 결과입니다.'); }}>내 여행 점검</button>}
        {(!props.pageContext || props.pageContext === '여행 설계') && <button type="button" disabled={busy} onClick={() => goToTool(trip.saved.length ? trip.travelStart ? 'itinerary' : 'dates' : 'places')}>{trip.saved.length ? trip.travelStart ? `내 일정 ${trip.saved.length}곳 확인` : `담은 ${trip.saved.length}곳의 날짜·출발지 정하기` : '여행지 찾아 일정에 담기'}</button>}
        {(props.pageContext === '축제' ? ['내 여행 날짜에 맞는 축제를 찾아줘','축제 접근 정보를 확인해줘'] : props.pageContext === '커뮤니티' ? ['내 여행 일정 공유 방법을 알려줘','이 경험을 내 일정에 참고하려면 어떻게 해?'] : !trip.saved.length ? ['선택한 조건으로 여행지를 찾아줘','필요한 편의를 고르는 방법을 알려줘'] : !trip.travelStart ? ['담은 장소들의 편의시설을 비교해줘'] : ['현재 일정에서 이동 부담을 줄여줘']).map(prompt => <button type="button" key={prompt} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}>{prompt}</button>)}
      </div>}
      </div>
      <NaruWorkspaceAside region={plan.region} dates={trip.travelStart ? `${trip.travelStart}${trip.travelEnd !== trip.travelStart ? ` — ${trip.travelEnd}` : ' · 당일'}` : '날짜 미정'} companion={(() => { const text = messages.findLast(m => m.role === 'user' && /부모님|혼자|친구|아이|가족|연인/.test(m.text))?.text || ''; if (/말고|아니|않/.test(text)) return '';  return /부모님/.test(text) ? '부모님' : /혼자/.test(text) ? '혼자' : /친구/.test(text) ? '친구' : /연인/.test(text) ? '연인' : /아이|가족/.test(text) ? '가족' : ''; })()} facilities={FACILITIES.filter(item => plan.selected.includes(item.key)).map(item => item.label)} places={trip.orderedSavedPlaces} draft={messages.findLast(message => message.draft && !message.applied && !message.cancelled && message.revision === revision)?.draft} busy={busy} activity={activity} onPrompt={focusPrompt} onTool={goToTool} onReview={() => { setReviewTrip(true); setReviewHours(false); follow.current = true; append('시간·휴식·귀가 점검 결과입니다.'); }} onPhoto={() => { const menu = dialogRef.current?.querySelector<HTMLDetailsElement>('.naru-add-menu'); if (menu) { menu.open = true; menu.querySelector('button')?.focus(); } }} onResult={() => { const message = messages.findLast(item => item.draft && !item.applied && !item.cancelled && item.revision === revision); if (message) { document.getElementById(`naru-reply-${message.id}`)?.scrollIntoView({ block: 'start' }); follow.current = false; } }} />
      </div>
      <div role="tabpanel" id="naru-panel-tools" aria-labelledby="naru-tab-tools" hidden={workspaceTab !== 'tools'}><section hidden={workspaceTab !== 'tools'} className="naru-workspace-content" aria-label="모든 여행 도구"><h2>{toolSurfaceGroup(internalTools.request.id) ? toolLabel(internalTools.request.id) : "여행 도구"}</h2>{toolSurfaceGroup(internalTools.request.id) && <button type="button" onClick={()=>internalTools.open("")}>← 모든 여행 도구</button>}<div hidden={Boolean(toolSurfaceGroup(internalTools.request.id))} className="naru-tool-catalog"><div className="naru-tools">{toolGroups.map(group => <div key={group.title}><h3>{group.title}</h3><div>{group.items.map(([id, label]) => <button key={id} type="button" onClick={() => goToTool(id)}>{label}</button>)}</div></div>)}</div><NaruHelpHub context={hubContext} canTalk={available !== false} onOpenTool={goToTool} onTalk={() => focusPrompt('')} /><div className="naru-tools">{[['experience','페이스·감각지도·여행여권'],['audio','오디오 가이드·후기'],['coordinates','장소 좌표 복원'],['route-check','이동 구간 확인']].map(([id,label])=><button key={id} type="button" onClick={()=>goToTool(id)}>{label}</button>)}</div></div>{!trip.travelStart && internalTools.request.id && <p role="status">{trip.saved.length ? '여행 날짜를 정하면 이 도구로 일정을 준비할 수 있어요.' : '여행지를 일정에 담으면 이 도구로 여행을 준비할 수 있어요.'} <button type="button" onClick={()=>goToTool(trip.saved.length ? "dates" : plan.region ? "places" : "conditions")}>{trip.saved.length ? '날짜·출발지 정하기' : '여행지 찾기'}</button></p>}<PlannerToolSurfaces visible={props.open && workspaceTab === 'tools'}/></section></div>
      <div role="tabpanel" id="naru-panel-saved" aria-labelledby="naru-tab-saved" hidden={workspaceTab !== 'saved'}>{workspaceTab === 'saved' && <section className="naru-workspace-content" aria-label="저장한 여행 작업"><h2>저장한 내용</h2>{pendingResume && <section className="naru-workspace-confirm" aria-label="다른 대화 열기 확인"><h3>현재 대화를 저장할까요?</h3><p>현재 일정은 다른 여행을 열기 전에 여행집에 보관합니다.</p><button type="button" onClick={() => { if (saveWorkspace()) loadWorkspace(pendingResume, true); }}>저장하고 열기</button><button type="button" onClick={() => loadWorkspace(pendingResume, true)}>대화 저장 없이 열기</button><button type="button" onClick={() => setPendingResume(null)}>취소</button></section>}<p>대화와 현재 일정을 이 기기에 저장하고 이어갈 수 있어요. 최근 대화 30개를 최대 10개 여행으로 보관하며, 사진 원본과 실행 버튼은 보관하지 않습니다.</p><label htmlFor="naru-workspace-title">여행 이름</label><input id="naru-workspace-title" maxLength={80} value={workspaceTitle} placeholder={`${plan.region || '경남'} 여행`} onChange={event => setWorkspaceTitle(event.target.value)} /><button type="button" disabled={busy || !trip.storageReady || photoPreparing} onClick={saveWorkspace}>대화와 현재 여행 저장</button><button type="button" disabled={busy || !trip.storageReady || voice.listening || photoPreparing || Boolean(photo)} onClick={() => {
        if (!saveWorkspace()) return;
        try { sessionStorage.setItem('wave-naru-resume', 'new'); workspaceNavigation.current = true; if (!props.onNewTrip()) { workspaceNavigation.current = false; sessionStorage.removeItem('wave-naru-resume'); setWorkspaceNotice('새 여행을 열지 못했어요. 현재 여행은 그대로입니다.'); } }
        catch { workspaceNavigation.current = false; sessionStorage.removeItem('wave-naru-resume'); setWorkspaceNotice('새 여행을 열지 못했어요. 현재 여행은 그대로입니다.'); }
      }}>저장하고 새 여행 준비</button>{bookStorageError && <p role="status">{bookStorageError}</p>}{workspaces.length === 0 && <p>아직 저장한 대화가 없어요.</p>}<div className="naru-saved-workspaces">{workspaces.map(workspace => <article key={workspace.id}><h3>{workspace.title}</h3><p>{new Date(workspace.updatedAt).toLocaleString('ko-KR')} · 대화 {workspace.messages.length}개</p><button type="button" disabled={busy || voice.listening || photoPreparing} onClick={() => loadWorkspace(workspace)}>{workspace.title} 이어가기</button><button type="button" disabled={busy} onClick={() => { const result = removeNaruWorkspace(localStorage, workspace.id); if (result.ok) { setWorkspaces(result.workspaces); setWorkspaceNotice('저장한 대화 기록을 삭제했어요. 여행집의 일정은 유지됩니다.'); } else setWorkspaceNotice('대화 기록을 삭제하지 못했어요. 다시 시도해 주세요.'); }} aria-label={`${workspace.title} 대화 기록 삭제`}>기록 삭제</button></article>)}</div><a href="/travel-book" onClick={close}>여행집에서 저장한 일정 관리 →</a></section>}</div>
      <details className="naru-extra-help" hidden={workspaceTab !== 'conversation'}><summary>여행 도구</summary><NaruHelpHub context={hubContext} canTalk={available !== false} onOpenTool={tool => goToTool(tool)} onTalk={() => inputRef.current?.focus({ preventScroll: true })} /></details>
      <VoiceInputMeter voice={voice} />
      {photo && <NaruPhotoAttachment photo={photo} disabled={busy || voice.listening} onChange={setPhoto} onPreparing={setPhotoPreparing} />}
      <form className="naru-input" onSubmit={event => { event.preventDefault(); void send(); }}><details className="naru-add-menu"><summary aria-label="사진 또는 여행 도구 추가"><NaruWorkspaceIcon name="attach" /></summary>{!photo && <NaruPhotoAttachment photo={null} disabled={busy || voice.listening} onChange={setPhoto} onPreparing={setPhotoPreparing} />}<button type="button" onClick={event => { (event.currentTarget.closest('details') as HTMLDetailsElement).open = false; setWorkspaceTab(current => current === 'tools' ? 'conversation' : 'tools'); }}>여행 도구</button></details><label className="sr-only" htmlFor="naru-message">나루에게 여행 질문하기</label><textarea ref={inputRef} id="naru-message" value={input} maxLength={1200} rows={1} placeholder="나루에게 요청하거나 사진을 올려보세요" onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} /><div><button type="button" aria-label={voice.listening ? '음성 입력 중단' : '음성으로 질문 입력'} aria-pressed={voice.listening} onClick={() => { if (voice.listening) voice.stop(); else voice.start(value => { setInput(value); inputRef.current?.focus(); }); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg></button>{busy ? <button key="stop-response" type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); sequence.current++; request.current?.abort(); request.current = null; plan.abortPlan(); setBusy(false); setStreamText(''); const stopped = { phase: 'idle', text: '작업을 중단했어요. 기존 일정은 그대로예요.' }; setActivity(stopped); props.onActivity(stopped); append('답변을 중단했어요. 원하는 내용을 다시 보내주세요.'); }}>중단</button> : <button key="send-message" type="submit" disabled={(!input.trim() && !photo) || voice.listening || photoPreparing} aria-label="나루에게 보내기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v15"/></svg></button>}</div></form>
      {voice.notice && <p className="naru-note" role="status">{voice.notice}</p>}
    </div>
  </dialog>;
}

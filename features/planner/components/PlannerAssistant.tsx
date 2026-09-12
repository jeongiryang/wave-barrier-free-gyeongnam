"use client";

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import LoadingState, { Spinner } from '../../../components/LoadingState';
import { localAssistantAction, validateAssistantAction, type AssistantAction } from '../../../lib/assistant-actions.js';
import { explorationPlaceAction } from '../../../lib/exploration-place-action.js';
import { onTripIdentity, readOnTrip } from '../../../lib/on-trip.js';
import type { VoiceEditReceipt } from '../../../lib/voice-edit.js';
import type { usePlannerPlan } from '../hooks/usePlannerPlan';
import type { useTripSelection } from '../hooks/useTripSelection';
import { useTravelVoice } from '../hooks/useTravelVoice';
import { profiles, themes } from '../constants';
import type { Place } from '../types';
import type { NaruJourney } from '../../../lib/naru-journey.js';
import { requestNaruJourney } from '../services/naru-journey';
import NaruJourneyProposal from './NaruJourneyProposal';
import NaruAvatar from '../../../components/NaruAvatar';

type Message = { id: number; role: 'user'|'assistant'; text: string; source?: string; proposal?: AssistantAction; draft?: NaruJourney; revision?: string; applied?: boolean };
type Props = { open: boolean; onClose: () => void; plan: ReturnType<typeof usePlannerPlan>; trip: ReturnType<typeof useTripSelection>; onRegion: (region: string, onCommitted?: () => void) => void; onSearch: () => Promise<boolean>; onPlace: (place: Place) => void; onAlternative: (placeId: string) => void; onUndoAlternative: () => boolean; canUndoAlternative: boolean; replacementVersion: number; onOpenTool: (tool: string) => void; onToolHost: (host: HTMLDivElement | null) => void; transport: 'walk'|'bicycle'|'transit'|'car'; routeRevision: string; onJourneyApplied: (draft: NaruJourney) => { undo: () => void; revision: string }; onRecalculate: (transport?: AssistantAction['transport']) => Promise<'changed'|'checked'>; onActivity: (value: { phase: string; text: string }) => void };
const toolGroups = [
  { title: '여행 시작', items: [['conditions','지역·활동'],['facilities','필요한 편의'],['dates','날짜·기간'],['places','여행지 찾기']] },
  { title: '내 일정', items: [['itinerary','날짜·순서·시간'],['map','지도·경로'],['alternatives','한 곳 바꾸기'],['comfort','이동 부담·휴식'],['course','코스 잇기'],['split','동행·합류']] },
  { title: '여행 준비', items: [['readiness','출발 전 확인'],['weather','날씨'],['transport','교통·귀가'],['compare','편의 비교'],['inquiry','방문 전 문의'],['budget','여행비']] },
  { title: '저장과 활용', items: [['share','저장·공유'],['offline','오프라인 요약'],['calendar','캘린더'],['on-trip','여행 당일 안내']] },
];
const toolLabel = (id: string) => toolGroups.flatMap(group => group.items).find(item => item[0] === id)?.[1] || '여행 도구';
const transportLabels = { car: '자동차', transit: '대중교통', walk: '도보', bicycle: '자전거' };
const PlannerAssistantPlaceTools = lazy(() => import('./PlannerAssistantPlaceTools'));

export default function PlannerAssistant(props: Props) {
  const { plan, trip, onToolHost, onClose } = props;
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'assistant', text: '안녕하세요, WAVE의 여행 가이드 나루예요. 가고 싶은 곳과 필요한 편의를 편하게 말해주세요. 함께 여행을 정리해 볼게요.' }]);
  const [input, setInput] = useState(''), [busy, setBusy] = useState(false), [tool, setTool] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false), [available, setAvailable] = useState<boolean | null>(null);
  const [showPlaces, setShowPlaces] = useState(false), [showEvidence, setShowEvidence] = useState(false);
  const [activity, setActivity] = useState({ phase: 'idle', text: '' });
  const sequence = useRef(0), request = useRef<AbortController | null>(null), messageId = useRef(0);
  const cancelRequest = useCallback(() => { sequence.current++; request.current?.abort(); }, []);
  useEffect(() => () => cancelRequest(), [cancelRequest]);
  const journeyUndo = useRef<{ region: string; themes: string[]; profiles: string[]; criteria: string; route: { undo: () => void; revision: string } } | null>(null);
  const undo = useRef<{ receipt: VoiceEditReceipt; replacementVersion: number } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null), log = useRef<HTMLDivElement>(null), follow = useRef(true);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toolHostCallback = props.onToolHost;
  const mountToolHost = useCallback((node: HTMLDivElement | null) => toolHostCallback(node), [toolHostCallback]);
  const voice = useTravelVoice();
  const known = [...new Map([...trip.orderedSavedPlaces, ...(plan.resultCurrent ? plan.plan?.places || [] : [])].map(place => [place.id, place])).values()];
  const revision = JSON.stringify([plan.region, plan.themes, plan.selected, plan.resultCurrent, plan.plan?.generatedAt, trip.voiceRevision, props.transport]);
  useEffect(() => {
    const prompt = new URLSearchParams(window.location.search).get('prompt');
    const frame = requestAnimationFrame(() => { if (prompt) setInput(prompt.slice(0, 1200)); });
    return () => cancelAnimationFrame(frame);
  }, []);
  const append = (text: string, extra: Partial<Message> = {}) => setMessages(current => [...current.slice(-29), { id: ++messageId.current, role: 'assistant', text, ...extra }]);

  useEffect(() => {
    if (!props.open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const media = window.matchMedia('(max-width: 800px)');
    const present = () => {
      if (!dialog) return;
      if (dialog.open) dialog.close();
      if (media.matches) dialog.showModal(); else dialog.show();
    };
    present();
    media.addEventListener('change', present);
    inputRef.current?.focus({ preventScroll: true });
    const control = new AbortController();
    void fetch('/api/assistant', { signal: control.signal }).then(response => response.json()).then(data => setAvailable(data.available === true)).catch(() => { if (!control.signal.aborted) setAvailable(false); });
    return () => { control.abort(); media.removeEventListener('change', present); if (dialog?.open) dialog.close(); if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); };
  }, [props.open, cancelRequest]);
  useLayoutEffect(() => { if (follow.current && log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, busy, showPlaces, showEvidence]);
  useLayoutEffect(() => { if (tool) dialogRef.current?.querySelector<HTMLElement>('.naru-workspace > header button')?.focus({ preventScroll: true }); }, [tool]);
  const { cancel: cancelVoice } = voice;
  useEffect(() => { if (!props.open) cancelVoice(); }, [props.open, cancelVoice]);

  const close = useCallback(() => {
    setTool(''); onToolHost(null); onClose();
    returnFocus.current?.focus({ preventScroll: true });
  }, [onToolHost, onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!props.open || !dialog) return;
    // The shared planner is a React portal with a different owner tree.
    // Native bubbling also receives keys from those existing controls.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]:not(.naru-panel)')) return;
      event.preventDefault(); event.stopPropagation(); close();
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [props.open, close]);
  function openTool(id: string) {
    const needsPlaces = !['conditions','facilities','dates','comfort','places','inquiry','compare'].includes(id);
    if (needsPlaces && !trip.saved.length) {
      append(`${toolLabel(id)}는 일정에 장소를 담으면 이어서 사용할 수 있어요. 먼저 여행지를 골라볼까요?`);
      id = plan.resultCurrent ? 'places' : 'conditions';
    } else if (id === 'places' && !plan.resultCurrent) {
      append('여행 조건을 고르고 여행지를 찾아주세요. 결과에서 마음에 드는 곳을 담을 수 있어요.');
      id = 'conditions';
    }
    if (!['inquiry','compare'].includes(id)) props.onOpenTool(id); else props.onToolHost(null);
    setTool(id); setToolsOpen(false);
  }

  async function send(value = input) {
    const text = value.trim();
    if (!text || busy || voice.listening) return;
    setInput(''); follow.current = true;
    const recent = [...messages.slice(-5).map(message => ({ role: message.role, content: message.text })), { role: 'user', content: text }];
    setMessages(current => [...current.slice(-29), { id: ++messageId.current, role: 'user', text }]);
    const id = ++sequence.current;
    const control = new AbortController(); request.current = control; setBusy(true);
    const timer = setTimeout(() => control.abort(), 48000);
    let journeyStarted = false;
    const progress = (phase: string, text: string) => { if (id !== sequence.current) return; const next = { phase, text }; setActivity(next); props.onActivity(next); };
    progress('thinking', '나루가 여행 요청을 이해하고 있어요.');
    try {
      const response = await fetch('/api/assistant', { method: 'POST', credentials: 'same-origin', signal: control.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: recent, context: { region: plan.region, profiles: plan.selected.join(','), themes: plan.theme, days: trip.tripDays, transport: props.transport, savedIds: trip.saved, places: known.map(({ id, name, city }) => ({ id, name, city })) } }) });
      if (response.status === 429) { if (id === sequence.current) { setInput(current => current || text); append('나루가 다른 답변을 마무리하고 있어요. 질문은 입력창에 남겨두었으니 잠시 뒤 다시 보내주세요. 여행 도구는 바로 사용할 수 있어요.'); progress('warning', '잠시 뒤 질문을 다시 보내주세요.'); } return; }
      if (!response.ok) throw new Error('unavailable');
      const data = await response.json();
      if (id !== sequence.current) return;
      setAvailable(true);
      const proposal = validateAssistantAction(data.proposal, known.map(place => place.id));
      if (proposal && ['create-itinerary', 'adapt-itinerary'].includes(proposal.action)) {
        journeyStarted = true;
        progress('searching', '실제 관광 데이터를 확인하고 있어요.');
        const draft = await requestNaruJourney(proposal, { region: plan.region, profiles: plan.selected, themes: plan.themes, start: trip.travelStart, end: trip.travelEnd, transport: props.transport,
          stops: trip.orderedSavedPlaces.map(place => ({ id: place.id, date: trip.scheduleAssignments[place.id] || trip.tripDays[0], fixed: Boolean(trip.fixedVisits[place.id]) })) }, control.signal, progress);
        if (id !== sequence.current) return;
        append(draft.stops.length || draft.restOnly ? '실제 관광 정보로 일정안을 준비했어요. 확인할 편의와 변경 내용을 살펴보고 적용해 주세요.' : '조건을 유지하며 찾아봤지만 바로 적용할 일정안을 만들지 못했어요. 아래에서 다음 방법을 골라주세요.', { source: 'AI 요청 · 공공 관광 데이터', draft, revision });
        progress(draft.stops.length || draft.restOnly ? 'done' : 'warning', draft.restOnly ? '나루가 휴식과 방문 조정안을 준비했어요.' : draft.stops.length ? `나루가 ${draft.stops.length}곳의 일정안을 준비했어요.` : '나루가 찾은 결과와 다음 방법을 확인해 주세요.');
        return;
      }
      append(typeof data.reply === 'string' ? data.reply.slice(0, 500) : '아래 작업을 확인해 주세요.', { source: 'AI', proposal: proposal || undefined, revision });
      progress('done', '나루의 답변이 도착했어요.');
    } catch {
      if (id !== sequence.current) return;
      if (!journeyStarted) setAvailable(false);
      if (journeyStarted) { setInput(current => current || text); append('관광 정보를 확인하는 중 연결이 끊겼어요. 기존 일정은 그대로 있으니 다시 요청하거나 여행 도구로 계속해 주세요.'); progress('warning', '일정 준비를 마치지 못했어요. 다시 시도할 수 있어요.'); return; }
      const proposal = localAssistantAction(text, known);
      setInput(current => current || text);
      append('AI 연결이 원활하지 않아요. 아래 간편 명령이나 여행 도구로 계속할 수 있어요.', { source: '간편 명령', proposal, revision });
      progress('warning', '연결을 확인해 주세요. 여행 도구는 사용할 수 있어요.');
    } finally { clearTimeout(timer); if (id === sequence.current) { setBusy(false); request.current = null; } }
  }
  function title(action: AssistantAction) {
    if (action.action === 'set-dates') return `${action.start} – ${action.end} 여행 기간`;
    if (action.action === 'recalculate-route') return action.transport ? `${transportLabels[action.transport]} 이동 경로 확인 · 기존 일정 유지` : '현재 순서로 이동 경로 다시 확인';
    if (action.action === 'save-trip') return '여행 저장·공유';
    const name = known.find(place => place.id === action.placeId)?.name || '';
    const titles: Record<string, string> = { settings: [action.region, action.profiles?.map(id => profiles.find(p => p.id === id)?.label).join(' · '), action.themes?.map(id => themes.find(t => t.id === id)?.label).join(' · ')].filter(Boolean).join(' / '), search: '현재 조건으로 여행지 찾기', add: `${name} 일정에 담기`, remove: `${name} 일정에서 빼기`, details: `${name} 이용 정보`, move: `${name} ${action.direction === 'up' ? '앞' : '뒤'}으로 이동`, visit: `${name} 체류 ${action.minutes}분`, break: `${name} 휴식 ${action.minutes}분`, day: `${action.date} 일정 보기`, 'start-time': `${action.time}에 출발`, deadline: `${action.time}까지 귀가`, readiness: '출발 전 확인할 것 정리', compare: '현재 장소의 편의 비교', alternatives: `${name} 대안 비교`, next: '다음 미방문 장소', undo: '마지막 변경 되돌리기', tool: toolLabel(action.tool || ''), help: '여행 도구 보기' };
    return titles[action.action] || '작업 확인';
  }
  function applyDraft(message: Message) {
    if (busy || message.applied || !message.draft || message.revision !== revision) return;
    const error = trip.applyJourneyDraft(message.draft);
    if (error) { append(error); return; }
    const draft = message.draft;
    plan.setRegion(draft.region); plan.setSelected(draft.profiles); plan.setTheme(draft.themes.join(','));
    plan.acceptPreparedPlan(draft.plan, draft);
    journeyUndo.current = { region: plan.region, themes: plan.themes, profiles: plan.selected, criteria: JSON.stringify([draft.region, draft.themes, draft.profiles]), route: props.onJourneyApplied(draft) };
    setMessages(current => current.map(item => item.id === message.id ? { ...item, applied: true } : item));
    append(draft.restOnly ? '방문 수와 쉬는 시간을 조정했어요. 고정 방문과 기존의 긴 휴식은 유지했습니다.' : `${draft.stops.length}곳의 날짜·순서·체류·휴식을 반영했어요. 지도와 실제 이동시간을 이어서 확인하고, 원하는 곳은 직접 수정할 수 있어요.`);
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
  async function apply(message: Message) {
    if (busy || message.applied || !message.proposal) return;
    if (message.revision !== revision) { append('그동안 여행 조건이 바뀌었어요. 현재 조건으로 다시 요청해 주세요.'); return; }
    const action = validateAssistantAction(message.proposal, known.map(place => place.id));
    if (!action) { append('지금 실행할 수 있는 작업인지 다시 확인해 주세요.'); return; }
    const place = known.find(place => place.id === action.placeId);
    follow.current = true;
    setMessages(current => current.map(item => item.id === message.id ? { ...item, applied: true } : item));
    if (action.action === 'tool') { openTool(action.tool || 'conditions'); return; }
    if (action.action === 'save-trip') { openTool('share'); return; }
    if (action.action === 'recalculate-route') {
      props.onActivity({ phase: 'routing', text: '현재 일정의 이동 구간을 확인하고 있어요.' });
      const result = await props.onRecalculate(action.transport);
      append(result === 'changed' ? '이동수단을 바꿨어요. 장소·날짜·순서·고정 방문·편의·휴식은 유지했어요. 새 이동수단의 경로는 지도에서 이어서 확인할 수 있어요.' : '경로 조회를 마쳤어요. 확인되지 않은 구간은 지도·경로에서 다시 확인할 수 있어요.');
      props.onActivity({ phase: 'done', text: result === 'changed' ? '이동수단을 반영했어요. 지도에서 경로 확인을 이어갑니다.' : '이동 구간 확인을 마쳤어요.' }); return;
    }
    if (action.action === 'set-dates') {
      const outside = trip.orderedSavedPlaces.some(place => { const day = trip.scheduleAssignments[place.id] || trip.travelStart; return day < action.start! || day > action.end!; });
      if (outside) { append('기존 장소의 방문일이 새 기간 밖에 있어요. 날짜 화면에서 방문일을 함께 옮겨주세요.'); openTool('dates'); return; }
      trip.restoreScheduleSnapshot({ ...trip, travelStart: action.start, travelEnd: action.end }); append('여행 기간을 반영했어요. 기존 방문일은 유지했습니다.'); return;
    }
    if (action.action === 'help') { setToolsOpen(true); append('지역 선택부터 공유까지 여기에서 사용할 수 있어요. 아래 도구를 골라주세요.'); return; }
    if (action.action === 'settings') {
      if (action.region && action.region !== plan.region && trip.saved.length) { props.onRegion(action.region, () => { if (action.profiles) plan.setSelected([...new Set([...plan.selected, ...action.profiles])]); if (action.themes) plan.setTheme(action.themes.join(',')); append('지역과 함께 요청한 편의·활동을 반영했어요.'); }); append('담아둔 일정이 있어요. 지역 변경 화면에서 기존 여행에 추가할지 새 여행으로 시작할지 골라주세요.'); return; }
      if (action.region) props.onRegion(action.region);
      // Merge requested facilities with current needs. Removing a need requires the explicit facility editor.
      if (action.profiles) plan.setSelected([...new Set([...plan.selected, ...action.profiles])]);
      if (action.themes) plan.setTheme(action.themes.join(','));
      append('여행 조건을 반영했어요. 필요한 편의는 유지합니다. 준비되면 아래에서 여행지를 찾아볼까요?'); return;
    }
    if (action.action === 'search') {
      const id = ++sequence.current;
      setBusy(true); try { const ok = await props.onSearch(); if (id !== sequence.current) return; setShowPlaces(true); append(ok ? '검색을 마쳤어요. 아래 여행지의 편의 정보를 보고 마음에 드는 곳을 담아보세요.' : '검색을 마치지 못했어요. 선택한 조건은 그대로 두었으니 다시 찾아볼 수 있어요.'); } finally { if (id === sequence.current) setBusy(false); } return;
    }
    if (['add','remove'].includes(action.action) && place) {
      if (action.action === 'add' && (!plan.resultCurrent || !plan.plan?.places.some(p => p.id === place.id))) { append('변경된 조건으로 다시 찾은 뒤 담아주세요.'); return; }
      const receipt = trip.applyVoiceEdit(action.action as 'add'|'remove', place, trip.activeDay);
      if (!receipt.ok) { append(receipt.reason); return; }
      undo.current = { receipt, replacementVersion: props.replacementVersion }; append(`${place.name}${action.action === 'add' ? ': 일정에 담았어요.' : ': 일정에서 뺐어요.'} 날짜와 순서도 함께 반영됐어요.`); return;
    }
    if (action.action === 'undo') {
      if (undoJourney()) return;
      const latest = undo.current;
      if (latest && latest.replacementVersion === props.replacementVersion) {
        append(trip.undoVoiceEdit(latest.receipt) ? '마지막 장소 변경을 되돌렸어요.' : '그 뒤 일정이 바뀌어 자동으로 되돌릴 수 없어요. 일정에서 확인해 주세요.');
      } else if (props.canUndoAlternative) {
        append(props.onUndoAlternative() ? '마지막 장소 교체를 되돌렸어요.' : '교체 뒤 일정이 바뀌어 자동으로 되돌릴 수 없어요. 일정에서 확인해 주세요.');
      } else append('되돌릴 장소 변경이 없어요.');
      undo.current = null; return;
    }
    if (action.action === 'details' && place) { props.onPlace(place); return; }
    if (action.action === 'alternatives' && place) {
      if (!trip.saved.includes(place.id)) { append('다른 장소로 바꾸려면 먼저 이 장소를 일정에 담아주세요. 후보들의 편의를 먼저 비교할 수도 있어요.'); openTool('compare'); return; }
      props.onAlternative(place.id); return;
    }
    if (['move','visit','break'].includes(action.action) && place) {
      if (!trip.saved.includes(place.id) || !trip.canChangePlace(place.id)) { append('고정 약속과 기존 일정을 먼저 확인해 주세요.'); openTool('itinerary'); return; }
      if (action.action === 'move') { if (!trip.movementFor(place.id)[action.direction!]) { append('이 순서로 옮길 수 없어요. 날짜나 고정 약속을 확인해 주세요.'); return; } trip.movePlace(place.id, action.direction!); }
      if (action.action === 'visit') trip.setVisitMinutes(place.id, action.minutes!);
      if (action.action === 'break') trip.setBreakMinutes(place.id, action.minutes!);
      append('일정에 반영했어요. 바뀐 시간과 이동은 일정에서 확인할 수 있어요.'); return;
    }
    if (action.action === 'day') { if (!trip.tripDays.includes(action.date!)) { append('여행 기간 안의 날짜를 골라주세요.'); return; } trip.setActiveDay(action.date!); append(`${action.date} 일정을 선택했어요.`); return; }
    if (action.action === 'start-time') { trip.setDayStartTime(action.time!); append(`하루 출발 시간을 ${action.time}로 바꿨어요.`); return; }
    if (action.action === 'deadline') { if (!trip.tripDays.includes(trip.activeDay)) { append('여행 날짜를 먼저 골라주세요.'); openTool('dates'); return; } const previous = trip.dayDeadlines[trip.activeDay]; trip.setDayDeadline(trip.activeDay, { time: action.time!, returnMinutes: previous?.returnMinutes ?? null, bufferMinutes: previous?.bufferMinutes ?? 20 }); append(`${trip.activeDay} 귀가 마감을 ${action.time}로 정했어요. 귀가 이동 시간은 별도로 확인해 주세요.`); return; }
    if (action.action === 'compare') { openTool('compare'); return; }
    if (action.action === 'readiness') { setShowEvidence(true); append('현재 확인한 장소별 편의 근거를 모았어요. 미확인 항목은 방문 전에 확인해 주세요.'); return; }
    if (action.action === 'next') {
      const daily = trip.orderedSavedPlaces.filter(place => (trip.scheduleAssignments[place.id] || trip.tripDays[0]) === trip.activeDay);
      try { const identity = onTripIdentity(daily, trip.activeDay); const remembered = trip.progressMemory[identity]; const progress = remembered?.unsaved ? remembered.value : readOnTrip(localStorage, identity, daily.map(place => place.id), true); const next = daily.find(place => !progress.marks[place.id]); if (next) { append(`다음 장소는 ${next.name}예요. 방문 완료나 건너뛰기는 여행 당일 안내에서 표시할 수 있어요.`); props.onPlace(next); } else append('이 날짜에 남은 장소가 없어요. 날짜와 방문 기록을 확인해 주세요.'); } catch { append('방문 기록을 읽지 못했어요. 여행 당일 안내에서 확인해 주세요.'); } return;
    }
  }
  const incompleteSources = plan.plan?.statuses.some(source => source.state === 'error' || source.partial);
  const explorationStates = (plan.plan?.explorationPlaces || []).map(place => explorationPlaceAction({ place, plan: plan.plan, current: plan.resultCurrent, region: plan.region, criteriaKey: revision }).kind);
  const explorationCount = explorationStates.filter(state => state === 'acknowledge').length;
  const mismatchCount = explorationStates.filter(state => state === 'mismatch').length;
  if (!props.open) return null;
  return <dialog ref={dialogRef} lang="ko" className={`naru-panel${tool ? ' naru-expanded' : ''}`} aria-label="WAVE 여행 가이드 나루와 대화" onCancel={event => { event.preventDefault(); close(); }} >
    <div className="naru-conversation">
      <header className="naru-heading"><NaruAvatar state={busy ? activity.phase : 'idle'} /><div><strong>WAVE의 나루</strong><small>{available ? '함께 계획하는 AI 여행 동행' : available === null ? <><Spinner />대화 연결 확인 중</> : '여행 도구로 계속할 수 있어요'}</small></div><button type="button" onClick={close} aria-label="나루 대화 닫기">×</button></header>
      <div className="naru-log" ref={log} role="log" aria-live="polite" aria-relevant="additions" onScroll={() => { if (log.current) follow.current = log.current.scrollHeight - log.current.scrollTop - log.current.clientHeight < 100; }}>
        {messages.map(message => <div key={message.id} className={`naru-message ${message.role}`}>
          <p>{message.text}</p>{message.source && <small>{message.source}</small>}
          {message.draft && <NaruJourneyProposal draft={message.draft} disabled={busy || !message.applied && message.revision !== revision} applied={Boolean(message.applied)} onApply={() => applyDraft(message)} onExplore={() => { if (busy || message.applied || message.revision !== revision) return; plan.setRegion(message.draft!.region); plan.setSelected([...new Set([...plan.selected, ...message.draft!.profiles])]); plan.setTheme(message.draft!.themes.join(',')); plan.acceptPreparedPlan(message.draft!.plan, message.draft!); openTool('conditions'); }} />}
          {message.draft && message.applied && <button type="button" disabled={busy} onClick={() => { if (!undoJourney()) append('되돌릴 일정안이 없어요.'); }}>마지막 일정안 적용 되돌리기</button>}
          {message.proposal && <div className="naru-proposal">
            <strong>{title(message.proposal)}</strong>
            <button type="button" aria-disabled={message.applied || undefined} disabled={!message.applied && (busy || message.revision !== revision)} onClick={() => void apply(message)}>
              {message.applied ? '확인한 작업' : message.revision !== revision ? '조건이 바뀌었어요 · 다시 요청' : message.proposal.action === 'recalculate-route' && message.proposal.transport ? `${transportLabels[message.proposal.transport]} 이동으로 ${props.transport === message.proposal.transport ? '경로 다시 확인' : '변경'}` : ['settings','set-dates','add','remove','move','visit','break','start-time','deadline','undo'].includes(message.proposal.action) ? '확인하고 적용' : '열기 / 실행'}
            </button>
          </div>}
        </div>)}
        {showPlaces && plan.resultCurrent && <div className="naru-result-list" aria-label="대화에서 찾은 여행지">{plan.plan?.places.length ? plan.plan.places.map(place => <article key={place.id}><strong>{place.name}</strong><p>{place.accessibility?.filter(field => field.state === 'confirmed').map(field => field.label).join(' · ') || '확인된 편의 정보 없음'}</p><button type="button" onClick={() => props.onPlace(place)}>편의 근거 보기</button><button type="button" disabled={trip.saved.includes(place.id)} onClick={() => append('이 장소를 담을까요?', { proposal: { action: 'add', placeId: place.id }, revision })}>{trip.saved.includes(place.id) ? '일정에 담았어요' : '일정에 담기'}</button></article>) : <div><p>{incompleteSources ? '관광·편의정보 제공처에 연결하지 못했거나 응답을 모두 받지 못했어요. 필요한 편의는 유지하고 다시 확인할 수 있어요.' : explorationStates.length ? '필요한 편의를 모두 확인한 여행지는 아직 없어요.' : '맞는 여행지가 없어요. 필요한 편의를 유지하고 활동이나 지역을 바꿔볼 수 있어요.'}</p>{explorationCount > 0 && <p>필요한 편의가 미확인인 후보 {explorationCount}곳이 있어요. 여행지 도구에서 근거와 다음 방법을 살펴보세요.</p>}{mismatchCount > 0 && <p>필요한 편의와 맞지 않는 후보 {mismatchCount}곳은 일정 추가에서 제외했어요.</p>}<button type="button" onClick={() => openTool('places')}>다른 방법으로 찾기</button></div>}</div>}
        {showEvidence && <div className="naru-evidence" aria-label="현재 장소의 편의 근거">{(trip.orderedSavedPlaces.length ? trip.orderedSavedPlaces : known).map(place => <article key={place.id}><strong>{place.name}</strong><p>{place.accessibility?.map(field => `${field.label}: ${field.state === 'confirmed' ? '확인됨' : field.state === 'negative' ? '조건과 맞지 않음' : '미확인'}`).join(' · ') || '편의 정보 미확인'}</p><small>{place.source || '출처 미제공'} · {place.checkedAt || '조회 시각 미제공'}</small><button type="button" onClick={() => props.onPlace(place)}>원문과 문의 정보</button></article>)}{!known.length && <p>여행지를 먼저 찾으면 장소별 근거를 모아드릴게요.</p>}<button type="button" onClick={() => openTool('readiness')}>날씨·이동까지 확인</button></div>}
        {busy && <div className="naru-typing" role="status"><Spinner /><span>{activity.text || '나루가 여행을 살펴보고 있어요'}</span></div>}
      </div>
      <div className="naru-shortcuts"><button type="button" onClick={() => void send(trip.saved.length ? '현재 일정에 이어서 가볍게 둘러볼 곳을 넣어줘' : '쉬엄쉬엄 경남 당일 여행 코스 만들어줘')} disabled={busy}>일정 만들어줘</button><button type="button" onClick={() => trip.saved.length ? openTool('map') : void send('아이와 갈 건데 축제도 하나 넣어줘')} disabled={busy}>{trip.saved.length ? '지도·일정 보기' : '축제와 함께'}</button><button type="button" onClick={() => setToolsOpen(!toolsOpen)} aria-expanded={toolsOpen}>모든 여행 도구</button></div>
      {toolsOpen && <div className="naru-tools">{toolGroups.map(group => <div key={group.title}><strong>{group.title}</strong><div>{group.items.map(([id, label]) => <button key={id} type="button" onClick={() => openTool(id)}>{label}</button>)}</div></div>)}</div>}
      <form className="naru-input" onSubmit={event => { event.preventDefault(); void send(); }}><label className="sr-only" htmlFor="naru-message">나루에게 여행 질문하기</label><textarea ref={inputRef} id="naru-message" value={input} maxLength={1200} rows={2} placeholder="예: 창원에서 계단을 피하고 쉬엄쉬엄 여행하고 싶어요" onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} /><div><button type="button" aria-label={voice.listening ? '음성 입력 중단' : '음성으로 질문 입력'} aria-pressed={voice.listening} onClick={() => { if (voice.listening) voice.cancel(); else voice.start(value => { setInput(value); inputRef.current?.focus(); }); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg></button>{busy ? <button type="button" onClick={() => { sequence.current++; request.current?.abort(); request.current = null; plan.abortPlan(); setBusy(false); const stopped = { phase: 'idle', text: '작업을 중단했어요. 기존 일정은 그대로예요.' }; setActivity(stopped); props.onActivity(stopped); append('답변을 중단했어요. 원하는 내용을 다시 보내주세요.'); }}>중단</button> : <button type="submit" disabled={!input.trim() || voice.listening} aria-label="나루에게 보내기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v15"/></svg></button>}</div></form>
      {voice.notice && <p className="naru-note" role="status">{voice.notice}</p>}<p className="naru-note">질문과 선택 조건은 WAVE의 로컬 AI 서버에서 처리하며 대화는 저장하지 않아요. 음성 입력은 브라우저 제공처가 처리할 수 있어요.</p>
    </div>
    {tool && <div className="naru-workspace"><header><strong>{toolLabel(tool)}</strong><button type="button" onClick={() => { setTool(''); props.onToolHost(null); requestAnimationFrame(() => inputRef.current?.focus()); }}>대화만 보기</button></header>{['inquiry','compare'].includes(tool) ? <div className="naru-tool-host"><Suspense fallback={<LoadingState>장소별 도구를 준비하고 있어요.</LoadingState>}><PlannerAssistantPlaceTools mode={tool} places={known} requiredKeys={plan.plan?.criteria?.facilityKeys || []} saved={trip.saved} current={plan.resultCurrent} onDetails={props.onPlace} onToggle={place => {
        setTool(''); props.onToolHost(null); follow.current = true;
        append('이 장소의 일정을 바꿀까요?', { proposal: { action: trip.saved.includes(place.id) ? 'remove' : 'add', placeId: place.id }, revision });
        requestAnimationFrame(() => { const buttons = log.current?.querySelectorAll<HTMLButtonElement>('.naru-proposal button:not(:disabled):not([aria-disabled=true])'); buttons?.[buttons.length - 1]?.focus(); });
      }} /></Suspense></div> : <div className="naru-tool-host" data-tool={tool} ref={mountToolHost} />}</div>}
  </dialog>;
}

import { validTripDate, boundedTripEnd, offsetTripDate } from './trip-dates.js';
import { validTripClock, sanitizeFixedVisits, sanitizeDayDeadlines } from './trip-time-constraints.js';
import { sanitizeComfort, sanitizeStopPurposes } from './trip-comfort.js';
import { voiceStateKey } from './voice-edit.js';
const fail = reason => ({ ok: false, reason });
const integer = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
const modes = ['transit', 'car', 'walk', 'bicycle'];
const dateList = (start, end) => { const days = []; for (let day = start; day <= end; day = offsetTripDate(day, 1)) days.push(day); return days; };
/** Shared pure planner for explicit UI and conversational edits. No I/O or invented venues. */
export function planTripCommand(state, command, places = []) {
  if (!state || !command || state.saved.length !== state.order.length || new Set(state.saved).size !== state.saved.length || state.saved.some(id => !state.order.includes(id))) return fail('저장한 장소를 불러온 뒤 다시 시도해 주세요.');
  const next = structuredClone(state);
  let label = '';
  const id = command.id;
  const currentDay = state.assignments[id] || state.days[0] || '';
  const place = places.find(item => item.id === id);
  const present = state.saved.includes(id);
  if (['stop', 'remove', 'move'].includes(command.type) && !present) return fail('현재 일정에 없는 장소예요.');
  if (command.type === 'add') {
    if (!place || !/^[1-9]\d{0,11}$/.test(id)) return fail('검색한 실제 장소를 선택해 주세요.');
    if (present) return fail('이미 담은 장소예요.');
    if (state.fixed[id]) return fail('이 장소에 고정 방문이 남아 있어요. 기존 약속을 확인해 주세요.');
    if (state.assignments[id] && !state.days.includes(state.assignments[id])) return fail('이 장소에 여행 기간 밖의 방문일이 남아 있어요. 기존 날짜를 확인해 주세요.');
    if (state.saved.length >= 12) return fail('한 여행에는 최대 12곳을 담을 수 있어요.');
    const day = command.day ?? state.activeDay ?? state.days[0] ?? '';
    if (day && !state.days.includes(day) || !day && state.days.length) return fail('방문 날짜를 다시 선택해 주세요.');
    if (command.afterId !== undefined) {
      const sameDay = state.order.filter(key => (state.assignments[key] || state.days[0] || '') === day);
      const at = sameDay.indexOf(command.afterId);
      if (at < 0 || sameDay.slice(at + 1).some(key => state.fixed[key])) return fail('고정한 방문을 옮기지 않는 위치를 골라주세요.');
    }
    next.saved.push(id);
    const last = next.order.findLastIndex(key => (next.assignments[key] || next.days[0] || '') === day);
    next.order.splice(command.afterId !== undefined ? next.order.indexOf(command.afterId) + 1 : last < 0 ? next.order.length : last + 1, 0, id);
    if (day) next.assignments[id] = day;
    label = `${place.name}을 일정에 담았어요.`;
  } else if (command.type === 'replace') {
    const previous = command.previousId;
    if (!state.saved.includes(previous) || present || !place || !/^[1-9]\d{0,11}$/.test(id) || state.fixed[previous] || state.fixed[id]) return fail('고정하지 않은 기존 장소와 실제 대안을 골라주세요.');
    next.saved = next.saved.map(key => key === previous ? id : key); next.order = next.order.map(key => key === previous ? id : key);
    for (const field of ['assignments', 'visits', 'breaks', 'purposes']) { delete next[field][id]; if (state[field][previous] !== undefined) next[field][id] = state[field][previous]; delete next[field][previous]; }
    label = `${place.name}(으)로 장소를 바꿨어요.`;
  } else if (command.type === 'remove') {
    if (state.fixed[id]) return fail('고정을 해제한 뒤 일정에서 뺄 수 있어요.');
    const sameDay = state.order.filter(key => (state.assignments[key] || state.days[0] || '') === currentDay);
    if (sameDay.slice(sameDay.indexOf(id) + 1).some(key => state.fixed[key])) return fail('뒤에 고정한 방문이 있어요. 고정 약속을 확인해 주세요.');
    next.saved = next.saved.filter(key => key !== id); next.order = next.order.filter(key => key !== id);
    for (const field of ['assignments', 'visits', 'breaks', 'purposes', 'fixed']) delete next[field][id];
    label = `${place?.name || '장소'}을 일정에서 뺐어요.`;
  } else if (command.type === 'stop') {
    const day = command.day ?? currentDay;
    if (day && !state.days.includes(day) || !day && state.days.length) return fail('여행 기간 안의 날짜를 선택해 주세요.');
    if (state.fixed[id] && day !== currentDay && command.fixed !== null) return fail('고정을 해제한 뒤 방문 날짜를 바꿀 수 있어요.');
    if (day !== currentDay) {
      const sameDay = state.order.filter(key => (state.assignments[key] || state.days[0] || '') === currentDay);
      if (sameDay.slice(sameDay.indexOf(id) + 1).some(key => state.fixed[key])) return fail('뒤에 고정한 방문이 있어요. 고정 약속을 확인해 주세요.');
    }
    if (command.minutes !== undefined && command.minutes !== null && !integer(command.minutes, 15, 720)) return fail('머무는 시간은 15~720분으로 입력해 주세요.');
    if (command.breakMinutes !== undefined && command.breakMinutes !== null && command.breakMinutes !== 0 && !integer(command.breakMinutes, 5, 120)) return fail('쉬는 시간은 5~120분으로 입력해 주세요.');
    if (command.fixed !== undefined && command.fixed !== null && !sanitizeFixedVisits({ [id]: command.fixed })[id]) return fail('고정 방문 정보를 확인해 주세요.');
    if (day) next.assignments[id] = day;
    if (command.minutes !== undefined) { if (command.minutes === null) delete next.visits[id]; else next.visits[id] = command.minutes; }
    if (command.breakMinutes !== undefined) { if (command.breakMinutes === null || command.breakMinutes === 0) delete next.breaks[id]; else next.breaks[id] = command.breakMinutes; }
    if (command.purpose !== undefined) { if (command.purpose === null) delete next.purposes[id]; else if (sanitizeStopPurposes({ [id]: command.purpose })[id]) next.purposes[id] = command.purpose; else return fail('쉬는 목적을 확인해 주세요.'); }
    if (command.fixed !== undefined) { if (command.fixed === null) delete next.fixed[id]; else next.fixed[id] = sanitizeFixedVisits({ [id]: command.fixed })[id]; }
    if (day !== currentDay) { next.order = next.order.filter(key => key !== id); const last = next.order.findLastIndex(key => (next.assignments[key] || next.days[0]) === day); next.order.splice(last < 0 ? next.order.length : last + 1, 0, id); }
    label = `${place?.name || '장소'}의 일정을 수정했어요.`;
  } else if (command.type === 'move') {
    if (!['up', 'down'].includes(command.direction)) return fail('이동할 순서를 선택해 주세요.');
    const sameDay = state.order.filter(key => (state.assignments[key] || state.days[0] || '') === currentDay);
    const index = sameDay.indexOf(id), target = sameDay[index + (command.direction === 'up' ? -1 : 1)];
    if (!target || state.fixed[id] || state.fixed[target]) return fail('이 순서로는 옮길 수 없어요. 고정 방문과 날짜를 확인해 주세요.');
    const a = next.order.indexOf(id), b = next.order.indexOf(target);
    [next.order[a], next.order[b]] = [next.order[b], next.order[a]];
    label = `${place?.name || '장소'}의 순서를 바꿨어요.`;
  } else if (command.type === 'schedule') {
    const start = command.start ?? state.days[0], end = command.end ?? state.days.at(-1);
    const undated = !state.days.length && command.start === undefined && command.end === undefined;
    if (!undated && (!validTripDate(start) || !validTripDate(end) || boundedTripEnd(start, end) !== end)) return fail('여행 날짜는 최대 7일 이내로 선택해 주세요.');
    if (command.startTime !== undefined && !validTripClock(command.startTime)) return fail('하루 시작 시각을 확인해 주세요.');
    if (command.transport !== undefined && !modes.includes(command.transport)) return fail('이동 수단을 선택해 주세요.');
    next.days = undated ? [] : dateList(start, end);
    // Explicit assignments, including visits outside the edited period, survive.
    const initial = !state.days.length;
    if (!undated) state.order.forEach((key, index) => { if (!next.assignments[key]) next.assignments[key] = initial ? next.days[Math.min(next.days.length - 1, Math.floor(index * next.days.length / Math.max(1, state.order.length)))] : state.days[0]; });
    if (!next.days.includes(next.activeDay)) next.activeDay = next.days[0] || '';
    if (command.startTime !== undefined) next.startTime = command.startTime;
    if (command.transport !== undefined) next.travelMode = command.transport;
    label = initial ? '날짜와 이동 수단을 적용했어요.' : '여행 설정을 수정했어요.';
  } else if (command.type === 'comfort') {
    if (!command.value || typeof command.value !== 'object' || Array.isArray(command.value)) return fail('걷기와 휴식 조건을 확인해 주세요.');
    next.comfort = sanitizeComfort({ ...state.comfort, ...command.value });
    if (Object.entries(command.value).some(([key, value]) => !Object.hasOwn(next.comfort, key) || next.comfort[key] !== value)) return fail('걷기와 휴식 시간을 확인해 주세요.');
    label = '걷기와 휴식 조건을 수정했어요.';
  } else if (command.type === 'deadline') {
    if (!state.days.includes(command.day)) return fail('여행 날짜를 선택해 주세요.');
    const value = command.value === null ? null : sanitizeDayDeadlines({ [command.day]: command.value })[command.day];
    if (command.value !== null && !value) return fail('마치는 시각과 이동 여유를 확인해 주세요.');
    if (value) next.deadlines[command.day] = value; else delete next.deadlines[command.day];
    label = '일정을 마치는 시각을 수정했어요.';
  } else return fail('변경할 내용을 다시 확인해 주세요.');
  if (voiceStateKey(next) === voiceStateKey(state)) return fail('이미 같은 내용으로 설정돼 있어요.');
  next.mode = 'manual'; next.manualOrder = [...next.order];
  return { ok: true, command, label, before: state, after: next, beforeKey: voiceStateKey(state), afterKey: voiceStateKey(next) };
}

import { emptyTrip, readTripValue, replaceCurrentTrip, tripStorageFailed, REGION_KEY } from './current-trip-storage.js';
import { mergeSavedPlaceCatalog } from './saved-place-catalog.js';
import { boundedTripEnd, validTripDate } from './trip-dates.js';
import { TRAVEL_REGIONS } from './account-travel/model.js';

/** Add to the current trip without moving any existing date or fixed visit. */
export function addFestivalToTrip(storage, festival, date) {
  if (tripStorageFailed(storage)) throw new Error('현재 여행에 아직 저장하지 못한 변경이 있어요. 여행 설계에서 저장을 다시 시도한 뒤 축제를 담아주세요.');
  if (typeof festival?.name !== 'string' || !festival.name.trim()) throw new Error('축제 이름과 정보를 다시 확인해 주세요.');
  if (!TRAVEL_REGIONS.includes(festival.city)) throw new Error('축제가 열리는 지역을 다시 확인해 주세요.');
  if (typeof festival?.id !== 'string' || !/^[1-9]\d{0,11}$/.test(festival.id) || !validTripDate(festival.startDate) || !validTripDate(festival.endDate) || !validTripDate(date) || date < festival.startDate || date > festival.endDate) throw new Error('축제가 열리는 날짜를 골라주세요.');
  const ids = JSON.parse(readTripValue(storage, 'wave-saved-places') || '[]');
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !/^[1-9]\d{0,11}$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('현재 여행의 장소 정보를 확인해 주세요. 기존 일정은 유지합니다.');
  if (ids.includes(festival.id)) return false;
  if (ids.length >= 12) throw new Error('현재 여행에 12곳이 있어요. 먼저 한 곳을 빼거나 축제로 새 여행을 시작해 주세요.');
  const schedule = ids.length ? JSON.parse(readTripValue(storage, 'wave-trip-schedule-v1') || '{}') : { travelStart: date, travelEnd: date, dayStartTime: '10:00', scheduleAssignments: {} };
  if (!schedule || !validTripDate(schedule.travelStart) || !validTripDate(schedule.travelEnd) || boundedTripEnd(schedule.travelStart, schedule.travelEnd) !== schedule.travelEnd
    || ids.some(id => { const day = schedule.scheduleAssignments?.[id] || schedule.travelStart; return !validTripDate(day) || day < schedule.travelStart || day > schedule.travelEnd; })) throw new Error('현재 여행의 방문 날짜를 확인해 주세요. 기존 일정은 유지합니다.');
  const start = schedule.travelStart < date ? schedule.travelStart : date, end = schedule.travelEnd > date ? schedule.travelEnd : date;
  if (!validTripDate(start) || !validTripDate(end) || boundedTripEnd(start, end) !== end) throw new Error('현재 여행과 축제 날짜가 7일보다 멀리 떨어져 있어요. 기존 여행을 보관하고 새 여행으로 열 수 있어요.');
  const catalog = JSON.parse(readTripValue(storage, 'wave-saved-place-catalog-v1') || '[]');
  const order = JSON.parse(readTripValue(storage, 'wave-trip-order-v1') || '{}');
  const ordered = [...new Set([...(order.ids || []).filter(id => ids.includes(id)), ...ids])];
  const values = { ...emptyTrip(festival.city, start, end),
    [REGION_KEY]: ids.length ? readTripValue(storage, REGION_KEY) || festival.city : festival.city,
    'wave-trip-themes-v1': readTripValue(storage, 'wave-trip-themes-v1') || '[]',
    'wave-saved-places': JSON.stringify([...ids, festival.id]),
    'wave-saved-place-catalog-v1': JSON.stringify(mergeSavedPlaceCatalog(catalog, [festival])),
    'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: [...ordered, festival.id] }),
    'wave-trip-schedule-v1': JSON.stringify({ ...schedule, travelStart: start, travelEnd: end, scheduleAssignments: { ...Object.fromEntries(ids.map(id => [id, schedule.scheduleAssignments?.[id] || schedule.travelStart])), [festival.id]: date }, visitMinutesByPlaceId: { ...schedule.visitMinutesByPlaceId, [festival.id]: 120 } }),
  };
  replaceCurrentTrip(storage, values);
  return true;
}

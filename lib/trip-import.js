import { readTripValue, replaceCurrentTrip, tripStorageFailed, REGION_KEY, THEMES_KEY } from './current-trip-storage.js';
import { createTravelBookSnapshot, sanitizeTravelBooks, upsertTravelBook, TRAVEL_BOOK_STORAGE_KEY, TRAVEL_BOOK_MAX_ITEMS } from './travel-book.js';
import { accountTripPayload, TRAVEL_REGIONS } from './account-travel/model.js';
import { boundedTripEnd, validTripDate } from './trip-dates.js';

/** Back up a different current itinerary before explicitly opening another. */
export function replaceTripWithBackup(storage, values) {
  if (!values || !TRAVEL_REGIONS.includes(values[REGION_KEY])) throw new Error('새 여행의 지역과 일정을 확인해 주세요.');
  const newIds = JSON.parse(values['wave-saved-places'] || 'null');
  const newSchedule = JSON.parse(values['wave-trip-schedule-v1'] || 'null');
  const newCatalog = JSON.parse(values['wave-saved-place-catalog-v1'] || 'null');
  const newOrder = JSON.parse(values['wave-trip-order-v1'] || 'null');
  if (!Array.isArray(newIds) || !Array.isArray(newCatalog) || !newSchedule || Array.isArray(newSchedule) || !newOrder || !Array.isArray(newOrder.ids)
    || !validTripDate(newSchedule.travelStart) || !validTripDate(newSchedule.travelEnd) || boundedTripEnd(newSchedule.travelStart, newSchedule.travelEnd) !== newSchedule.travelEnd) throw new Error('새 여행의 날짜와 장소 정보를 확인해 주세요.');
  if (newIds.length) accountTripPayload({ ...newSchedule, region: values[REGION_KEY], placeIds: newIds, themes: JSON.parse(values[THEMES_KEY] || '[]') });
  if (newIds.some(id => !newCatalog.some(place => place?.id === id && typeof place.name === 'string' && place.name.trim()))
    || new Set(newOrder.ids).size !== newOrder.ids.length || newOrder.ids.some(id => !newIds.includes(id))
    || !['auto', 'manual'].includes(newOrder.mode) || newOrder.mode === 'manual' && newOrder.ids.length !== newIds.length) throw new Error('새 여행의 장소 이름과 방문 순서를 다시 확인해 주세요.');
  if (tripStorageFailed(storage)) throw new Error('현재 여행에 아직 저장하지 못한 변경이 있어요. 여행 설계에서 저장을 다시 시도한 뒤 다른 여행을 열어주세요.');
  const ids = JSON.parse(readTripValue(storage, 'wave-saved-places') || '[]');
  const incoming = JSON.parse(values['wave-saved-places'] || '[]');
  const currentSchedule = readTripValue(storage, 'wave-trip-schedule-v1') || '{}';
  const currentOrder = JSON.parse(readTripValue(storage, 'wave-trip-order-v1') || '{}');
  const orderedIds = currentOrder.mode === 'manual' && Array.isArray(currentOrder.ids) ? [...new Set([...currentOrder.ids.filter(id => ids.includes(id)), ...ids])] : ids;
  if (ids.length && (JSON.stringify(ids) !== JSON.stringify(incoming) || currentSchedule !== values['wave-trip-schedule-v1'])) {
    const catalog = JSON.parse(readTripValue(storage, 'wave-saved-place-catalog-v1') || '[]');
    const region = readTripValue(storage, REGION_KEY) || catalog[0]?.city || '경남 전체';
    const previous = createTravelBookSnapshot({ ...JSON.parse(currentSchedule), region, themes: JSON.parse(readTripValue(storage, THEMES_KEY) || '[]'), title: `${region} · 이어서 만들던 여행`, places: orderedIds.map(id => catalog.find(place => place.id === id) || { id, name: `이름 확인이 필요한 장소 (${id})`, city: region }) });
    if (!previous) throw new Error('현재 여행의 날짜를 확인한 뒤 다른 여행을 열어주세요. 기존 일정은 유지합니다.');
    const books = sanitizeTravelBooks(JSON.parse(storage.getItem(TRAVEL_BOOK_STORAGE_KEY) || '[]'));
    if (books.length >= TRAVEL_BOOK_MAX_ITEMS && !books.some(book => book.fingerprint === previous.fingerprint)) throw new Error('여행집이 가득 차 있어요. 기존 여행을 내보내거나 직접 정리한 뒤 새 여행을 열어주세요. 지금 여행은 유지됩니다.');
    storage.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify(upsertTravelBook(books, previous)));
  }
  replaceCurrentTrip(storage, values);
}

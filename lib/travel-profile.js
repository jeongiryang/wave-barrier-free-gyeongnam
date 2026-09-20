const regionLabel = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
const facilityLabels = { parking: '장애인 주차', route: '접근로', wheelchair: '휠체어', elevator: '승강기', restroom: '장애인 화장실', lactationroom: '수유실', guidehuman: '안내요원', audioguide: '음성 안내', signguide: '수어 안내', helpdog: '안내견' };
const placeTypeLabels = { '12': '자연 관광지', '14': '문화 시설', '15': '축제·행사', '25': '여행 코스', '28': '레포츠', '32': '숙박', '38': '쇼핑', '39': '음식점' };

function top(values, labels = {}, limit = 3) {
  const counts = new Map();
  for (const value of values) if (typeof value === 'string' && value) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].map(([key, count]) => ({ key, label: labels[key] || key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko')).slice(0, limit);
}

export function buildTravelProfile(input) {
  if (!input || !Array.isArray(input.trips)) return null;
  const trips = input.trips.flatMap(value => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || !regionLabel(value.region) || !Number.isInteger(value.dayCount) || value.dayCount < 1 || !Array.isArray(value.facilityKeys) || !Array.isArray(value.placeTypeIds)) return [];
    return [{ id: value.id, region: regionLabel(value.region), dayCount: Math.min(30, value.dayCount), facilityKeys: value.facilityKeys.filter(item => typeof item === 'string'), placeTypeIds: value.placeTypeIds.filter(item => typeof item === 'string') }];
  });
  if (trips.length < 2) return null;
  const regions = top(trips.map(trip => trip.region));
  const facilities = top(trips.flatMap(trip => trip.facilityKeys), facilityLabels);
  const placeTypes = top(trips.flatMap(trip => trip.placeTypeIds), placeTypeLabels);
  const lengths = top(trips.map(trip => trip.dayCount === 1 ? '하루' : trip.dayCount === 2 ? '1박 2일' : '그 이상'), {}, 3);
  const facilityKeys = facilities.map(entry => Object.entries(facilityLabels).find(([, label]) => label === entry.label)?.[0] || entry.key).slice(0, 3);
  return { tripCount: trips.length, regions: regions.map(({ key: _key, ...entry }) => entry), facilities: facilities.map(({ key: _key, ...entry }) => entry), placeTypes: placeTypes.map(({ key: _key, ...entry }) => entry), lengths: lengths.map(({ key: _key, ...entry }) => entry), suggestion: { region: regions[0]?.key || null, facilityKeys } };
}

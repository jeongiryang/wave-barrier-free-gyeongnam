const compact = value => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

function numericId(value) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `91${String(hash >>> 0).padStart(10, '0')}`;
}

export function restroomTemporaryStop(restroom) {
  const official = restroom?.sources?.find(source => source.type === 'official');
  if (!restroom || !official?.referenceDate) return null;
  return {
    id: numericId(`${restroom.id}:${restroom.address}`), contentTypeId: '', city: compact(restroom.address).split(' ').slice(0, 2).join(' '),
    name: compact(restroom.name), address: compact(restroom.address), summary: '공식 공중화장실 임시 경유지', image: '',
    mapX: String(restroom.destination.longitude), mapY: String(restroom.destination.latitude), score: null,
    knownFields: 1, unknownFields: 7, negativeFields: 0, features: ['장애인용 대변기 등록 정보'], details: [],
    source: `${official.provider} · 기준일 ${official.referenceDate}`,
    temporaryStop: { kind: 'official-restroom', sourceId: compact(restroom.id), referenceDate: official.referenceDate, evidence: restroom.evidence },
  };
}

export function sanitizeTemporaryRestroomStops(values) {
  if (!Array.isArray(values)) return [];
  return values.flatMap(value => {
    const marker = value?.temporaryStop, latitude = Number(value?.mapY), longitude = Number(value?.mapX);
    if (!value || marker?.kind !== 'official-restroom' || !/^[1-9]\d{0,11}$/.test(compact(value.id)) || !/^\d{4}-\d{2}-\d{2}$/.test(compact(marker.referenceDate)) || !compact(marker.sourceId) || !compact(value.name) || !compact(value.address).startsWith('경상남도') || !Number.isFinite(latitude) || latitude < 33 || latitude > 39 || !Number.isFinite(longitude) || longitude < 124 || longitude > 132) return [];
    const evidence = Object.fromEntries(['accessibleToilet','entranceStep','entranceDoor','grabBars','turningSpace','sinkAccess','elevatorRequired','emergencyBell'].map(key => [key, compact(marker.evidence?.[key]) || 'unknown']));
    if (evidence.accessibleToilet !== 'confirmed') return [];
    return [{ id: compact(value.id), name: compact(value.name).slice(0,120), address: compact(value.address).slice(0,180), mapX: String(longitude), mapY: String(latitude), source: compact(value.source).slice(0,160), temporaryStop: { kind: 'official-restroom', sourceId: compact(marker.sourceId).slice(0,80), referenceDate: compact(marker.referenceDate), evidence } }];
  }).slice(0, 12);
}

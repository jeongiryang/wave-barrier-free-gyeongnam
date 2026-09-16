export function buildEvidenceReviewQueue(places, reports, now = Date.now()) {
  const observations = Array.isArray(reports) ? reports : [];
  return (Array.isArray(places) ? places : []).flatMap(place => {
    const route = (place.accessibility || []).find(field => field.key === 'route');
    const current = observations.filter(report => report.placeId === place.id);
    const difficult = current.filter(report => ['difficult','blocked'].includes(report.readings?.mobility)).length;
    const clear = current.filter(report => report.readings?.mobility === 'clear').length;
    const conflict = route?.state === 'confirmed' && difficult > 0 || route?.state === 'negative' && clear > 0;
    const checked = Date.parse(place.checkedAt || '');
    const old = !Number.isFinite(checked) || now - checked > 30 * 24 * 60 * 60 * 1000;
    if (!current.length && !old) return [];
    const priority = conflict || difficult >= 2 ? 'high' : old || difficult === 1 ? 'medium' : 'routine';
    const reason = conflict ? '공식 접근로 정보와 최근 현장 관찰이 달라요.' : difficult >= 2 ? '서로 다른 최근 제보에서 이동 어려움이 반복됐어요.' : old ? '공식 확인 시각이 없거나 30일을 지났어요.' : '최근 현장 관찰을 다음 확인 때 참고할 수 있어요.';
    return [{ placeId: place.id, name: place.name, priority, conflict, reports: current.length, officialState: route?.state || 'unknown', reason, checkedAt: place.checkedAt || '' }];
  }).sort((a, b) => ({ high: 0, medium: 1, routine: 2 }[a.priority] - { high: 0, medium: 1, routine: 2 }[b.priority]));
}

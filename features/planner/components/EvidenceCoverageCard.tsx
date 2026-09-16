import { assessEvidenceCoverage } from '../../../lib/evidence-coverage.js';
import type { Place } from '../types';

export default function EvidenceCoverageCard({ places, requiredKeys, compact = false, onCompare, onAlternatives }: {
  places: Place[];
  requiredKeys: string[];
  compact?: boolean;
  onCompare?: () => void;
  onAlternatives?: () => void;
}) {
  const result = assessEvidenceCoverage(places, requiredKeys);
  return <section className={`evidence-coverage-card${compact ? ' compact' : ''}`} aria-label="WAVE 동선 정보 확인도">
    <div className="evidence-coverage-heading">
      <div><small>WAVE 동선 정보 확인도</small><h3>{result.percent === null ? '계산 전' : `${result.percent}% · 범위 ${result.grade}`}</h3></div>
      {result.percent !== null && <div className="evidence-coverage-meter" role="img" aria-label={`공식 데이터 확인 범위 ${result.percent}퍼센트`}><i style={{ width: `${result.percent}%` }} /></div>}
    </div>
    {result.percent === null
      ? <p>일정에 장소를 담고 필요한 편의를 고르면 장소별 공식 정보의 확인 범위를 계산합니다.</p>
      : <><p>필요한 편의 {result.facilities}개 × 일정 {result.places}곳 중 공식 데이터에 상태가 기록된 항목의 비율입니다.</p>
        <ul aria-label="편의정보 확인 현황"><li><b>{result.confirmed}</b> 정보 있음</li><li><b>{result.negative}</b> 조건과 맞지 않음</li><li><b>{result.unknown}</b> 미확인</li></ul></>}
    <p className="evidence-coverage-note">안전·통행 가능 점수가 아닙니다. 미확인과 불일치를 숨기지 않으며 방문 전 장소에 다시 확인해야 합니다.</p>
    {(onCompare || onAlternatives) && <div className="evidence-coverage-actions">{onCompare && <button type="button" onClick={onCompare}>장소별 편의 비교</button>}{onAlternatives && <button type="button" onClick={onAlternatives}>날씨·휴무 대체 장소</button>}</div>}
  </section>;
}

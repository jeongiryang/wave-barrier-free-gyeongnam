export default function PlannerJourneyRail({ labels, details = [], current, available, onNavigate, en = false }: {
  labels: string[]; details?: string[]; current: number; available: boolean[]; onNavigate: (index: number) => void; en?: boolean;
}) {
  return <nav className="planner-step-navigation" aria-label={en ? "Trip planning steps" : "여행 만들기 단계"}>{labels.map((label, index) => <button key={label} type="button" aria-label={`${index + 1}. ${label}`} aria-current={index === current ? "step" : undefined} data-passed={index < current || undefined} disabled={!available[index]} onClick={() => onNavigate(index)}><span className="planner-nav-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><span><strong>{label}</strong>{details[index] && <small>{details[index]}</small>}</span></button>)}</nav>;
}

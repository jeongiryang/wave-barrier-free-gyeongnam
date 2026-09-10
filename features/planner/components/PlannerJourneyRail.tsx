export default function PlannerJourneyRail({ labels, current, available, onNavigate }: {
  labels: string[]; current: number; available: boolean[]; onNavigate: (index: number) => void;
}) {
  return <nav className="reference-progress" aria-label="여행 만들기 단계">{labels.map((label, index) => <button key={label} type="button" aria-label={`${index + 1}. ${label}`} aria-current={index === current ? "step" : undefined} data-passed={index < current || undefined} disabled={!available[index]} onClick={() => onNavigate(index)}><i aria-hidden="true">{index + 1}</i><span>{label}</span></button>)}</nav>;
}

import { tripBoardCells, type TripProgress } from '../../../lib/on-trip.js';

const labels = { done: '다녀옴', current: '지금', upcoming: '아직', skipped: '건너뜀' } as const;
function StateMark({ state }: { state: keyof typeof labels }) {
  if (state === 'done') return <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2.5 8.5l3.2 3.2 7.8-8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
  return <span aria-hidden="true">{state === 'skipped' ? '／' : state === 'current' ? '│' : '○'}</span>;
}
export default function TripBoardView({ progress, stops, onSelectPlace }: { progress: TripProgress; stops: Array<{ id: string; title: string }>; onSelectPlace: (id: string) => void }) {
  const cells = tripBoardCells(progress, stops);
  if (!cells.length) return null;
  const done = cells.filter(cell => cell.state === 'done').length;
  return <section className="trip-board" aria-labelledby="trip-board-title"><h4 id="trip-board-title">전체 진행 판</h4><p><strong>{cells.length}곳 중 {done}곳</strong> 다녀왔어요.</p><ol>{cells.map(cell => <li key={cell.id} data-state={cell.state} aria-current={cell.state === 'current' ? 'step' : undefined}><button type="button" onClick={() => onSelectPlace(cell.id)}><span className="trip-board-order">{cell.order}</span><strong>{cell.title}</strong><span className="trip-board-state"><StateMark state={cell.state} />{labels[cell.state]}</span></button></li>)}</ol></section>;
}

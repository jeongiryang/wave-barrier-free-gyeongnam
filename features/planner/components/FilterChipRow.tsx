'use client';
import { useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * 여러 개를 동시에 고를 수 있는 칩 선택 줄.
 *
 * 스펙 39(음식 종류로 거르기)를 위해 만들었지만 음식에 한정되지 않는 범용
 * 구성요소다. 스펙 35(지역 가게 보기)도 같은 컴포넌트를 재사용한다.
 *
 * - 지금 결과에 실제로 나타난 선택지만 넘겨받는다. 없는 선택지를 채워 넣지
 *   않는다. 그 판단은 호출하는 쪽(`lib/food-category.js` 등)의 책임이다.
 * - 켜짐을 색으로만 알리지 않는다. `aria-pressed`와 체크 인라인 SVG를 함께
 *   둔다.
 * - `app/styles/simple-wave.css`의 토큰만 인라인 스타일로 쓴다. 새 CSS 규칙을
 *   추가하지 않는다.
 */

export type FilterChipOption = {
  id: string;
  label: string;
  count: number;
};

const VISIBLE_LIMIT = 8;

const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', listStyle: 'none', padding: 0, margin: '8px 0' };
const offChip: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', padding: '8px 14px',
  border: '1px solid var(--line)', borderRadius: 'var(--r-full, 999px)', background: 'var(--surface)', color: 'var(--ink)', fontSize: '.9rem',
};
const onChip: CSSProperties = { ...offChip, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--on-blue)' };
const CheckMark = () => <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6.4 4.3 9.2 10.5 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default function FilterChipRow({ options, selected, onToggle, onClear, ariaLabel }: {
  options: FilterChipOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  ariaLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  if (!options.length) return null;
  const sorted = [...options].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_LIMIT);
  const hiddenCount = sorted.length - visible.length;
  return <div className="filter-chip-row">
    <ul style={row} aria-label={ariaLabel}>
      {visible.map((option) => {
        const on = selected.includes(option.id);
        return <li key={option.id} style={{ listStyle: 'none' }}>
          <button type="button" aria-pressed={on} style={on ? onChip : offChip} onClick={() => onToggle(option.id)}>
            {on && <CheckMark />}{option.label} {option.count}
          </button>
        </li>;
      })}
      {hiddenCount > 0 && <li style={{ listStyle: 'none' }}>
        <button type="button" style={offChip} onClick={() => setShowAll(true)}>더 보기 +{hiddenCount}</button>
      </li>}
      {selected.length > 0 && <li style={{ listStyle: 'none' }}>
        <button type="button" style={offChip} onClick={onClear}>선택 지우기</button>
      </li>}
    </ul>
  </div>;
}

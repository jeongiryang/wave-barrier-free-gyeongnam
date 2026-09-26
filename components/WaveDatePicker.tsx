'use client';

import { useEffect, useId, useImperativeHandle, useRef, useState, useSyncExternalStore, type InputHTMLAttributes, type KeyboardEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import './wave-date-picker.css';

type Props = { label?: string; value: string; onChange: (value: string) => void; min?: string; max?: string; inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max'>; inputRef?: Ref<HTMLInputElement> };
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function parse(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || iso(date) !== value ? null : date;
}
const dayLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
const subscribe = () => () => {};

/** A keyboard-operable calendar with the same ISO date contract as native fields. */
export default function WaveDatePicker({ label, value, onChange, min: minimum, max: maximum, inputProps, inputRef }: Props) {
  const min = minimum && parse(minimum) ? minimum : undefined;
  const max = maximum && parse(maximum) ? maximum : undefined;
  const id = useId();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(inputRef, () => input.current!);
  const [calendarLabel, setCalendarLabel] = useState(label || inputProps?.['aria-label'] || '날짜');
  useEffect(() => {
    const node = input.current;
    if (!node) return;
    const invalid = value && (!parse(value) || (min && value < min) || (max && value > max));
    node.setCustomValidity(invalid ? `올바른 날짜를 입력해 주세요.${min ? ` ${min}부터` : ''}${max ? ` ${max}까지` : ''}` : '');
  }, [value, min, max]);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const [month, setMonth] = useState(() => (parse(value) || new Date()));
  const [active, setActive] = useState(value);
  const allowed = (date: string) => (!min || date >= min) && (!max || date <= max);
  const clamp = (date: string) => min && date < min ? min : max && date > max ? max : date;
  function focusDate(date: string) {
    const next = clamp(date);
    setActive(next);
    setMonth(parse(next)!);
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }
  function open() {
    if (inputProps?.disabled || inputProps?.readOnly) return;
    const associatedLabel = input.current?.labels?.[0];
    const text = associatedLabel && Array.from(associatedLabel.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim();
    setCalendarLabel(label || inputProps?.['aria-label'] || text || '날짜');
    const next = clamp(iso(parse(value) || new Date()));
    setActive(next);
    setMonth(parse(next)!);
    dialog.current?.showModal();
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLButtonElement>(`[data-date="${next}"]`)?.focus());
  }
  function close() { dialog.current?.close(); opener.current?.focus(); }
  function choose(date: string) { onChange(date); close(); }
  function changeMonth(amount: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1, 12);
    focusDate(iso(next));
  }
  function keydown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const next = parse(date)!;
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -next.getDay(), End: 6 - next.getDay() };
    if (event.key in offsets) {
      event.preventDefault(); next.setDate(next.getDate() + offsets[event.key]); focusDate(iso(next));
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      const target = new Date(next.getFullYear(), next.getMonth() + (event.key === 'PageUp' ? -1 : 1), 1, 12);
      target.setDate(Math.min(next.getDate(), new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
      focusDate(iso(target));
    }
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const cells = Array.from({ length: Math.ceil((first.getDay() + last.getDate()) / 7) * 7 }, (_, index) => {
    const day = index - first.getDay() + 1;
    return day > 0 && day <= last.getDate() ? iso(new Date(month.getFullYear(), month.getMonth(), day, 12)) : null;
  });
  return <span className="wave-date-picker">
    <input {...inputProps} ref={input} aria-label={label || inputProps?.['aria-label']} type="text" inputMode="numeric" placeholder={inputProps?.placeholder || 'YYYY-MM-DD'} value={value} min={minimum} max={maximum}
      pattern="\d{4}-\d{2}-\d{2}" maxLength={10} onChange={event => { inputProps?.onChange?.(event); if (!inputProps?.onChange) onChange(event.target.value); }}
      onKeyDown={event => { inputProps?.onKeyDown?.(event); if (!event.defaultPrevented && event.key === 'ArrowDown' && event.altKey) { event.preventDefault(); open(); } }} />
    <button ref={opener} className="wave-date-open" type="button" disabled={inputProps?.disabled || inputProps?.readOnly} aria-label={`${label || calendarLabel} 달력 열기`} aria-haspopup="dialog" onClick={open}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="4"/><path d="M7 3v4m10-4v4M3 11h18"/></svg>
    </button>
    {mounted && createPortal(<dialog ref={dialog} className="wave-date-dialog" aria-labelledby={`${id}-title`} onKeyDown={event => event.stopPropagation()} onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
      onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}>
      <div className="wave-date-title"><h2 id={`${id}-title`}>{calendarLabel} 날짜 선택</h2><button type="button" aria-label="달력 닫기" title="닫기" onClick={close}>×</button></div>
      <div className="wave-date-month"><button type="button" disabled={Boolean(min && iso(first) <= min)} onClick={() => changeMonth(-1)}>이전 달</button>
        <strong aria-live="polite">{month.getFullYear()}년 {month.getMonth() + 1}월</strong>
        <button type="button" disabled={Boolean(max && iso(last) >= max)} onClick={() => changeMonth(1)}>다음 달</button></div>
      <table className="wave-date-grid" role="grid" aria-label={`${month.getFullYear()}년 ${month.getMonth() + 1}월`}>
        <thead><tr>{['일', '월', '화', '수', '목', '금', '토'].map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
        <tbody>{Array.from({ length: cells.length / 7 }, (_, row) => <tr key={row}>{cells.slice(row * 7, row * 7 + 7).map((date, col) => <td key={col} aria-selected={date === value}>{date && <button type="button" data-date={date} aria-label={dayLabel(date)} aria-current={date === iso(new Date()) ? 'date' : undefined}
          disabled={!allowed(date)} tabIndex={date === active ? 0 : -1} onKeyDown={event => keydown(event, date)} onClick={() => choose(date)}>{Number(date.slice(-2))}</button>}</td>)}</tr>)}</tbody>
      </table>
      <div className="wave-date-bottom"><span>날짜를 선택하면 적용돼요</span><button type="button" disabled={!allowed(iso(new Date()))} onClick={() => choose(iso(new Date()))}>오늘</button></div>
    </dialog>, document.body)}
  </span>;
}

'use client';
import { useId, useLayoutEffect, useRef, useState, type SelectHTMLAttributes, type Ref } from 'react';
import { createPortal } from 'react-dom';
import './wave-select.css';
import NightIcon from './NightIcon';

/** Native form contract, with a consistent, keyboard-accessible menu below the field. */
export default function WaveSelect({ ref, icon, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement>; icon?: string }) {
  const id = useId();
  const native = useRef<HTMLSelectElement>(null), trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const [portal, setPortal] = useState<Element | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ value: string; text: string; disabled: boolean }[]>([]);
  const [label, setLabel] = useState(props['aria-label'] || props.title || '선택');
  const [selected, setSelected] = useState('');
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ top: 0, left: 0, width: 200, maxHeight: 280 });
  useLayoutEffect(() => {
    const node = native.current;
    if (!node) return;
    const next = Array.from(node.options).map(option => ({ value: option.value, text: option.text, disabled: option.disabled || Boolean(option.closest('optgroup')?.disabled) }));
    setItems(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    setSelected(node.value);
    const labelled = props['aria-labelledby']?.split(' ').map(key => document.getElementById(key)?.textContent || '').join(' ');
    const clone = node.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
    clone?.querySelectorAll('.wave-select,select').forEach(child => child.remove());
    setLabel(props['aria-label'] || labelled || clone?.textContent?.trim() || props.title || '선택');
  }, [props.children, props.value, props.defaultValue, props['aria-label'], props['aria-labelledby'], props.title]);
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  function choose(index: number) {
    const node = native.current, item = items[index];
    if (!node || !item || item.disabled) return;
    node.value = item.value;
    node.dispatchEvent(new Event('change', { bubbles: true }));
    setSelected(node.value);
    close();
  }
  function show() {
    if (props.disabled) return;
    const button = trigger.current!;
    setPortal(button.closest('.preference-controls,dialog,[popover]') || document.body);
    if (innerHeight - button.getBoundingClientRect().bottom < 220) button.scrollIntoView({ block: 'center', behavior: 'instant' });
    const rect = button.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 180), innerWidth - 24);
    setPlacement({ top: rect.bottom + 8, left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)), width, maxHeight: Math.max(80, Math.min(280, innerHeight - rect.bottom - 20)) });
    setActive(Math.max(0, items.findIndex(item => item.value === selected)));
    setOpen(true);
  }
  useLayoutEffect(() => {
    if (!open) return;
    menu.current?.focus({ preventScroll: true });
    const dismiss = (event: Event) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false); };
    const reposition = () => {
      const anchor = trigger.current;
      if (!anchor) return;
      if (innerHeight - anchor.getBoundingClientRect().bottom < 160) anchor.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = anchor.getBoundingClientRect();
      if (rect) setPlacement(current => ({ ...current, top: rect.bottom + 8, left: Math.max(12, Math.min(rect.left, innerWidth - current.width - 12)), maxHeight: Math.max(80, Math.min(280, innerHeight - rect.bottom - 20)) }));
    };
    document.addEventListener('pointerdown', dismiss);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => { document.removeEventListener('pointerdown', dismiss); window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
  }, [open]);
  useLayoutEffect(() => {
    const list = menu.current;
    const option = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !list || !option) return;
    // Scroll only the menu: scrollIntoView can also move the page and its anchor.
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [active, open]);
  return <span className="wave-select">
    <select {...props} ref={node => { native.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }} tabIndex={-1} aria-hidden="true" className="wave-select-native" onFocus={() => trigger.current?.focus()} onInvalid={() => trigger.current?.focus()} />
    <button ref={trigger} type="button" role="combobox" title={icon ? `${label}: ${items.find(item => item.value === selected)?.text || ''}` : props.title} data-icon-action={icon ? '' : undefined} aria-label={label} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="listbox" disabled={props.disabled || !items.length} aria-busy={!items.length} className={`wave-select-trigger ${props.className || ''}`} style={props.style} onClick={() => open ? close() : show()} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); show(); } }}>
      {icon ? <NightIcon name={icon} size={20}/> : items.find(item => item.value === selected)?.text || '\u00a0'}
    </button>
    {open && portal && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label} aria-activedescendant={`${id}-${active}`} tabIndex={-1} className="wave-select-menu" style={placement} data-placement="below" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      else if (event.key === 'Tab') { close(); }
      else if (['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(active); }
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); const enabled = items.map((item, index) => !item.disabled ? index : -1).filter(index => index >= 0);
        const position = enabled.indexOf(active);
        setActive(event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1)! : enabled[(position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length] ?? active);
      } else if (event.key.length === 1) { const index = items.findIndex(item => !item.disabled && item.text.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase())); if (index >= 0) setActive(index); }
    }}>{items.map((item, index) => <div role="option" key={`${item.value}-${index}`} id={`${id}-${index}`} data-index={index} data-active={active === index} aria-selected={selected === item.value} aria-disabled={item.disabled} onPointerMove={() => !item.disabled && setActive(index)} onClick={() => choose(index)}>{item.text}</div>)}</div>, portal)}
  </span>;
}

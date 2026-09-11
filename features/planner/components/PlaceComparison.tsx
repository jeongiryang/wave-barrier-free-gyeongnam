"use client";
import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import type { Place } from "../types";
import { toggleComparison } from "../../../lib/place-decision-tools.js";

const ComparisonDialog = lazy(() => import("./PlaceComparisonDialog").catch(() => ({ default: ({ onClose, en }: { onClose: () => void; en: boolean }) => <p role="alert">{en ? "Comparison could not load. Close and reload to try again." : "비교 화면을 불러오지 못했어요. 닫고 새로고침해 다시 시도해 주세요."} <button type="button" onClick={onClose}>{en ? "Close" : "닫기"}</button></p> })));

export default function PlaceComparison({ places, requiredKeys, saved, current, en, onToggle, children }: {
  places: Place[]; requiredKeys: string[]; saved: string[]; current: boolean; en: boolean; onToggle: (place: Place) => void;
  children: (control: { active: boolean; ids: string[]; toggle: (id: string) => void }) => ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const selected = places.filter(place => ids.includes(place.id));
  const selectedIds = selected.map(place => place.id);
  const toggle = (id: string) => setIds(value => toggleComparison(value, id, places.map(place => place.id)));
  return <>
    {places.length > 0 && <div className="place-comparison-toolbar"><button type="button" aria-pressed={active} onClick={() => { setActive(value => !value); setIds([]); }}>{active ? en ? "Finish comparing" : "비교 선택 닫기" : en ? "Compare facilities" : "편의 비교"}</button>
      {active && <><span role="status">{en ? `Choose 2–3 places · ${selected.length} selected` : `2~3곳을 골라보세요 · ${selected.length}곳 선택`}</span><button type="button" disabled={selected.length < 2} onClick={() => setOpen(true)}>{en ? `Compare ${selected.length} places` : `선택한 ${selected.length}곳 비교`}</button></>}
    </div>}
    {children({ active, ids: selectedIds, toggle })}
    {active && selected.length > 0 && <div className="place-comparison-selection">{selected.map(place => <button key={place.id} type="button" onClick={() => toggle(place.id)} aria-label={`${place.name} ${en ? "remove from comparison" : "비교에서 빼기"}`}>{place.name} <span aria-hidden="true">×</span></button>)}</div>}
    {open && selected.length >= 2 && <Suspense fallback={<p role="status">{en ? "Preparing comparison…" : "편의를 나란히 정리하고 있어요…"}</p>}><ComparisonDialog places={selected} requiredKeys={requiredKeys} saved={saved} current={current} en={en} onClose={close} onToggle={onToggle} /></Suspense>}
  </>;
}

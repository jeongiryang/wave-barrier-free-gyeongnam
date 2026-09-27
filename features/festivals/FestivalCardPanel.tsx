"use client";
import type { ReactNode } from "react";
import NightIcon from "../../components/NightIcon";
import { usePlaceDialogFocus } from "../planner/hooks/usePlaceDialogFocus";

export default function FestivalCardPanel({ id, title, onClose, children }: { id: string; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = usePlaceDialogFocus(true, onClose);
  return <dialog ref={dialog} id={id} className="simple-dialog festival-tools-dialog" aria-labelledby={`${id}-title`}>
    <header><h2 id={`${id}-title`} tabIndex={-1}>{title}</h2><button type="button" data-icon-action="" aria-label="축제 도구 닫기" title="닫기" onClick={onClose}><NightIcon name="close"/></button></header>
    {children}
  </dialog>;
}

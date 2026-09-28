"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useHeaderPopover } from "./useHeaderPopover";
import HelpCenter from "./HelpCenter";
import { PreferenceControls, useSitePreferences } from "./SitePreferences";
import FooterAccountLink from "../features/auth/components/FooterAccountLink";
import NightIcon from "./NightIcon";

export default function WaveHeaderTools({ onNew }: { onNew?: () => void }) {
  const { locale, hydrated } = useSitePreferences();
  const en = locale === "en";
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useHeaderPopover(panel, trigger, open, () => setOpen(false));
  const [tourActive, setTourActive] = useState(false);
  useEffect(() => {
    const node = menu.current;
    const onTour = (event: Event) => {
      const active = (event as CustomEvent<boolean>).detail;
      setTourActive(active);
      setOpen(!active);
    };
    node?.addEventListener("wave:support-tour", onTour);
    return () => node?.removeEventListener("wave:support-tour", onTour);
  }, []);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !document.querySelector(".help-tour-dialog")) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <>
    <div className="account-menu wave-support-menu" data-open={open} inert={!hydrated} aria-busy={!hydrated} ref={menu} onKeyDown={event => {
      if (event.currentTarget.contains(event.target as Node) && event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault(); setOpen(false);
        trigger.current?.focus();
      }
    }} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !document.querySelector(".help-tour-dialog")) setOpen(false);
    }}>
      <button type="button" className="wave-support-trigger" ref={trigger} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} aria-label={en ? "WAVE support menu" : "WAVE 이용 안내 메뉴"} title={en ? "Support" : "이용 안내"}><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
      {(open || tourActive) && <div ref={panel} popover="auto" id={panelId} className="account-popover wave-support-panel header-dropdown"><div className="support-shortcuts"><Link href="/planner#places" aria-label={en ? "Find places" : "여행지 검색"} title={en ? "Find places" : "여행지 검색"}><NightIcon name="search"/></Link><Link href="/travel-book" aria-label={en ? "My trips" : "내 여행"} title={en ? "My trips" : "내 여행"}><NightIcon name="bookmark"/></Link><Link href="/guide" aria-label={en ? "How to use WAVE" : "사용 가이드"} title={en ? "How to use WAVE" : "사용 가이드"}><NightIcon name="info"/></Link><Link href="/demo" aria-label="시연용 여행" title="시연용 여행"><NightIcon name="play"/></Link>{onNew && <button type="button" data-icon-action="" title={en ? "New trip" : "새 여행"} aria-label={en ? "New trip" : "새 여행"} onClick={() => { setOpen(false); onNew(); }}><NightIcon name="plus"/></button>}</div><div className="support-settings"><HelpCenter iconOnly /><PreferenceControls iconOnly /></div></div>}
    </div>
    <FooterAccountLink iconOnly />
  </>;
}

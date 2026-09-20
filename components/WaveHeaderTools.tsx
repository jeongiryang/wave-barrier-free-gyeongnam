"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import HelpCenter from "./HelpCenter";
import { PreferenceControls, useSitePreferences } from "./SitePreferences";
import FooterAccountLink from "../features/auth/components/FooterAccountLink";

export default function WaveHeaderTools() {
  const pathname = usePathname();
  const { locale, hydrated, motion } = useSitePreferences();
  const en = locale === "en";
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !document.querySelector(".help-tour-dialog")) {
        if (menu.current) menu.current.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return <>
    <details className="account-menu wave-support-menu" inert={!hydrated} aria-busy={!hydrated} ref={menu} onKeyDown={event => {
      if (event.currentTarget.contains(event.target as Node) && event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault(); event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !document.querySelector(".help-tour-dialog")) event.currentTarget.open = false;
    }}>
      <summary aria-label={en ? "WAVE support menu" : "WAVE 이용 안내 메뉴"} title={en ? "Support" : "이용 안내"}><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></summary>
      <div className="account-popover wave-support-panel"><Link href="/guide">{en ? "How to use WAVE" : "사용 가이드"}</Link><Link href="/demo">시연용 여행</Link>{pathname === "/" && motion !== "calm" && <button type="button" onClick={() => { if (menu.current) menu.current.open = false; window.dispatchEvent(new Event("wave-replay-intro")); }}>인트로 다시 보기</button>}<HelpCenter /><PreferenceControls /></div>
    </details>
    <FooterAccountLink iconOnly />
  </>;
}

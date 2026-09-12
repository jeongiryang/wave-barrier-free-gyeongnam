"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HelpCenter from "./HelpCenter";
import { PreferenceControls, useSitePreferences } from "./SitePreferences";
import FooterAccountLink from "../features/auth/components/FooterAccountLink";

/** Fallback utilities for pages without the shared WAVE navigation. */
export default function WaveFooterTools() {
  const path = usePathname();
  const en = useSitePreferences().locale === "en";
  if (path === "/" || path === "/planner" || path === "/travel-book" || path === "/outings" || path === "/guide" || path?.startsWith("/my-trips") || path?.startsWith("/join-trip") || path?.startsWith("/community")) return null;
  if (path === "/login" || path === "/register") return null;
  return <footer className="wave-footer-tools" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 12, padding: 12, color: "var(--muted)", background: "var(--surface)", fontSize: ".8rem" }} aria-label={en ? "WAVE support" : "WAVE 이용 안내"}>
    <Link className="account-button" href="/guide">{en ? "How to use WAVE" : "사용 가이드"}</Link>
    <HelpCenter /><PreferenceControls />
    <FooterAccountLink />
  </footer>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HelpCenter from "./HelpCenter";
import { PreferenceControls, useSitePreferences } from "./SitePreferences";
import FooterAccountLink from "../features/auth/components/FooterAccountLink";

/** Utility actions remain available below the content, outside the primary nav. */
export default function WaveFooterTools() {
  const path = usePathname();
  const en = useSitePreferences().locale === "en";
  if (path === "/login" || path === "/register") return null;
  return <footer className="wave-footer-tools" aria-label={en ? "WAVE support" : "WAVE 이용 안내"}>
    <Link href="/guide">{en ? "How to use WAVE" : "사용 가이드"}</Link>
    <FooterAccountLink />
    <HelpCenter /><PreferenceControls />
  </footer>;
}

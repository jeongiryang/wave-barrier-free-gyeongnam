"use client";

import Link from "next/link";
import { useSitePreferences } from "./SitePreferences";

export default function PolicyFooterLinks() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return <nav className="policy-footer-links" aria-label={en ? "Service policies" : "서비스 정책"}>
    <Link href="/policies">{en ? "Service policy" : "운영정책"}</Link>
    <Link href="/privacy">{en ? "Privacy" : "개인정보처리방침"}</Link>
    <Link href="/terms">{en ? "Terms of use" : "이용약관"}</Link>
  </nav>;
}

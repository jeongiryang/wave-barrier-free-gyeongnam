"use client";

import { lazy, Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "../../../components/SitePreferences";
import ProfileIcon from "./ProfileIcon";

function AccountUnavailable() {
  const en = useSitePreferences().locale === "en";
  return <a className="account-button" href="/account" data-account-fallback>{en ? "Account" : "계정 관리"}</a>;
}
const AccountMenu = lazy(() => import("./AccountMenu").catch(() => ({ default: AccountUnavailable })));

export default function FooterAccountLink({ iconOnly = false }: { iconOnly?: boolean }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const { locale, hydrated } = useSitePreferences();
  const en = locale === "en";
  const path = usePathname();
  const loginHref = path && path !== "/" ? `/login?next=${encodeURIComponent(path)}` : "/login";
  const link = <button type="button" className={iconOnly ? "wave-profile-entry" : "account-button"} aria-label={en ? "Account" : "계정 관리"} aria-haspopup="true" disabled={!hydrated} aria-busy={!hydrated} onClick={(event) => {
    event.preventDefault();
    setOpen(true);
    setReady(true);
  }}>{iconOnly ? <ProfileIcon /> : en ? "Account" : "계정 관리"}</button>;
  return ready ? <Suspense fallback={link}><AccountMenu initialOpen={open} loginHref={loginHref} iconOnly={iconOnly} /></Suspense> : link;
}

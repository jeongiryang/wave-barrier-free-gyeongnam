"use client";

import { lazy, Suspense, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

const AccountMenu = lazy(() => import("./AccountMenu"));

export default function FooterAccountLink() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const en = useSitePreferences().locale === "en";
  const link = <a href="/account" onPointerEnter={() => setReady(true)} onClick={(event) => {
    event.preventDefault();
    setOpen(true);
    setReady(true);
  }}>{en ? "Account" : "계정 관리"}</a>;
  return ready ? <Suspense fallback={link}><AccountMenu initialOpen={open} /></Suspense> : link;
}

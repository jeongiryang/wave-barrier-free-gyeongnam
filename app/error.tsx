"use client";

import { useSitePreferences } from "../components/SitePreferences";

export default function ErrorPage() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  return (
    <main className="route-state-page" lang={en ? "en" : "ko"} aria-labelledby="route-error-title">
      <div className="route-state-mark" aria-hidden="true">!</div>
      <p>CONNECTION PAUSE</p>
      <h1 id="route-error-title">{en ? "Please reload this page." : "화면을 다시 불러와 주세요."}</h1>
      <span role="alert">{en ? "Reload the page to continue. The itinerary and conditions saved on this device will stay here." : "화면을 새로 불러오면 다시 이용할 수 있습니다. 이 기기에 저장한 일정과 조건은 유지됩니다."}</span>
      <div>
        <button type="button" onClick={() => window.location.reload()}>{en ? "Reload this page" : "화면 다시 불러오기"}</button>
        <a href="/planner">{en ? "Return to trip planning" : "여행 설계로 돌아가기"}</a>
      </div>
    </main>
  );
}

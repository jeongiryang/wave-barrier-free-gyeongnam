"use client";

import { usePlaceAvailability } from "../hooks/usePlaceAvailability";
import { regionNames } from "../../../lib/gyeongnam-region-names";
import { Spinner } from "../../../components/LoadingState";

export default function PlannerAvailability({ region, selected, themes, en }: {
  region: string; selected: string[]; themes: string[]; en: boolean;
}) {
  const { data, error, retry } = usePlaceAvailability(region, themes, true);
  const count = data?.candidates.filter(place => !selected.length || selected.some(profile => place.profiles.includes(profile))).length;
  return <div className="condition-availability" role="status" aria-live="polite" aria-atomic="true">
    <div><span>{en ? regionNames[region] || region : region} · {selected.length ? en ? "Results for your facilities" : "선택한 편의 검색 결과" : en ? "Place search results" : "여행지 검색 결과"}</span>
      <strong>{!error && count === undefined && <Spinner />}{error ? en ? "Could not check results" : "검색 결과를 확인하지 못했어요" : count === undefined ? en ? "Checking places…" : "여행지를 확인하고 있어요…" : en ? <><b>{count.toLocaleString("en-US")}</b> places{data?.status.partial ? " confirmed" : ""}</> : <>총 <b>{count.toLocaleString("ko-KR")}</b>건{data?.status.partial ? " 확인" : ""}</>}</strong>
      {count === 0 && <p>{en ? "No reported matches yet. Keep your facility needs and try more activities or a wider area." : "아직 확인된 곳이 없어요. 필요한 편의는 그대로 두고, 활동을 더 고르거나 지역을 넓혀보세요."}</p>}
      <small>{data ? en ? `Among ${data.candidates.length} candidates searched · Up to 12 places${selected.length ? " · With evidence for your facilities" : ""}${data.status.partial ? " · Some information is still unavailable" : ""}` : `현재 검색한 ${data.candidates.length}개 후보 기준 · 최대 12곳${selected.length ? " · 선택한 편의의 확인 근거가 있는 곳" : ""}${data.status.partial ? " · 일부 정보 확인 중" : ""}` : error ? en ? "Your choices are kept." : "선택한 조건은 유지돼요." : en ? "Results update with your choices." : "조건을 바꾸면 검색 결과도 함께 바뀝니다."}</small>
    </div>
    {(error || data?.status.partial) && <button type="button" onClick={retry}>{en ? "Check again" : "다시 확인"}</button>}
  </div>;
}

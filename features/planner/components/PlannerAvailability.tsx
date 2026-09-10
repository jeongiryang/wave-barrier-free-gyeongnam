"use client";

import { usePlaceAvailability } from "../hooks/usePlaceAvailability";

export default function PlannerAvailability({ region, selected, themes }: {
  region: string; selected: string[]; themes: string[];
}) {
  const { data, error, retry } = usePlaceAvailability(region, themes, true);
  const count = data?.candidates.filter(place => !selected.length || selected.some(profile => place.profiles.includes(profile))).length;
  return <div className="condition-availability" role="status" aria-live="polite" aria-atomic="true">
    <div><span>{region} · {selected.length ? "선택한 편의 검색 결과" : "여행지 검색 결과"}</span>
      <strong>{error ? "검색 결과를 확인하지 못했어요" : count === undefined ? "여행지를 확인하고 있어요…" : <>총 <b>{count.toLocaleString("ko-KR")}</b>건{data?.status.partial ? " 확인" : ""}</>}</strong>
      <small>{data ? `현재 검색한 ${data.candidates.length}개 후보 기준 · 최대 12곳${selected.length ? " · 선택한 편의의 확인 근거가 있는 곳" : ""}${data.status.partial ? " · 일부 정보 확인 중" : ""}` : error ? "선택한 조건은 유지돼요." : "조건을 바꾸면 검색 결과도 함께 바뀝니다."}</small>
    </div>
    {(error || data?.status.partial) && <button type="button" onClick={retry}>다시 확인</button>}
  </div>;
}

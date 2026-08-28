import { useMemo } from "react";
import { profiles, themes } from "../constants";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { PlanData } from "../types";
import { buildItinerarySchedule } from "../optimization/itinerary-schedule.js";
import AudioGuidePlayer from "./AudioGuidePlayer";

interface PlannerRouteOverviewProps {
  plan: PlanData | null;
  region: string;
  theme: string;
  selectedProfileIds: string[];
  liveCount: number;
  audioGuide: ReturnType<typeof useAudioGuide>;
  participation: ReturnType<typeof usePlannerParticipation>;
}

export default function PlannerRouteOverview({ plan, region, theme, selectedProfileIds, liveCount, audioGuide, participation }: PlannerRouteOverviewProps) {
  const activeProfiles = profiles.filter((profile) => selectedProfileIds.includes(profile.id));
  const activeTheme = themes.find((item) => item.id === theme)?.label ?? "자연·휴양";
  const activeStops = useMemo(() => plan?.stops ?? [], [plan?.stops]);
  const routeSchedule = useMemo(() => buildItinerarySchedule({
    places: activeStops.map((stop, index) => ({ ...stop, id: stop.id || `${stop.title}-${index}` })),
    days: ["route-preview"],
    startTime: "10:00",
  })[0]?.entries ?? [], [activeStops]);
  const { shareState, shareUrl, sharePlan } = participation;

  return <div className={`journey-workspace-block route-section ${plan ? "revealed" : ""}`} id="route">
    <div className="journey-subheading" data-reveal><div><span>STEP 03</span><h3>YOUR W.A.V.E ROUTE</h3></div><p>추천 장소를 하루 코스로 연결</p></div>
    <div className="route-intro" data-reveal>
      <div><span className={`route-status ${plan?.mode ?? "fallback"}`}><i />{plan?.mode === "live" ? "최신 여행정보 반영" : plan?.mode === "partial" ? "확인된 정보 우선 반영" : "코스 미리보기"}</span><h2>{activeProfiles.map((item) => item.label).slice(0, 2).join("·")} 조건으로 찾은<br />{region}의 하루</h2><p>{region} · {activeTheme} · {activeProfiles.map((item) => item.label).join(" · ")}</p></div>
      <div className="route-metrics"><div><small>추천 지점</small><strong>{activeStops.length}<em>곳</em></strong></div><div><small>걷기 코스</small><strong>{plan?.course?.distance || "—"}<em>{plan?.course?.distance ? "km" : ""}</em></strong></div><div><small>확인한 정보</small><strong>{liveCount || "—"}<em>{liveCount ? "개" : ""}</em></strong></div></div>
    </div>
    <div className="itinerary-layout" data-reveal>
      <ol className="itinerary-list">{routeSchedule.slice(0, 4).map((entry, index) => <li key={entry.place.id}><span className="stop-time">{entry.startsAtLabel}<small>{entry.travelSource === "estimate" ? `예상 이동 ${entry.travelMinutes}분` : `기본 이동 ${entry.travelMinutes}분`}</small></span><i className="stop-line" aria-hidden="true"><b>{index + 1}</b></i><div><small>{entry.place.source}</small><h3>{entry.place.title}</h3><p>{entry.place.note} · 체류 {entry.visitMinutes}분, {entry.endsAtLabel} 종료 예정</p></div><span className={`stop-check ${entry.place.evidenceState || "context"}`}>{entry.place.evidenceState === "verified" ? "✓ 편의근거 확인" : entry.place.evidenceState === "limited" ? "! 방문 전 확인" : "i 추천 맥락"}</span></li>)}</ol>
      <AudioGuidePlayer audio={plan?.audio} controller={audioGuide} />
    </div>
    <div className="share-strip" data-reveal><div><span>여행 계획 저장·공유</span><h3>지금 만든 코스를 30일 동안 공유 링크로 보관합니다.</h3><p>로그인 없이 이용할 수 있으며 접근성 프로필은 계정 정보와 결합하지 않습니다.</p></div><button type="button" onClick={sharePlan} disabled={!plan || shareState === "saving"}>{shareState === "saving" ? "링크 만드는 중" : shareState === "done" ? "링크 복사 완료 ✓" : "공유 링크 만들기"}<span>↗</span></button>{shareState === "error" && <small>공유 저장을 확인해 주세요.</small>}{shareUrl && <a href={shareUrl}>공유 화면 열기</a>}</div>
    {plan?.course && <div className="course-strip" data-reveal><span>두루누비 걷기 코스</span><div><h3>{plan.course.name}</h3><p>{plan.course.summary}</p></div><dl><div><dt>거리</dt><dd>{plan.course.distance}km</dd></div><div><dt>시간</dt><dd>{plan.course.minutes}분</dd></div><div><dt>난이도</dt><dd>{plan.course.level}</dd></div></dl></div>}
  </div>;
}

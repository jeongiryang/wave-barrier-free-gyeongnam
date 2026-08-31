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

function travelEvidenceLabel(source: string, minutes: number) {
  if (source === "route") return `확인된 경로 ${minutes}분`;
  if (source === "estimate") return `직선거리 기반 추정 ${minutes}분`;
  return `경로 미확인 · 임시 ${minutes}분`;
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
  const hasVerifiedStops = activeStops.some((stop) => stop.evidenceState === "verified");
  const routeStatusClass = hasVerifiedStops ? "live" : plan ? "partial" : "fallback";
  const routeStatusLabel = hasVerifiedStops ? "공식 편의근거 반영" : plan ? "편의근거 확인 필요" : "코스 준비 전";

  return <div className={`journey-workspace-block route-section ${plan ? "revealed" : ""}`} id="route">
    <div className="journey-subheading" data-reveal><div><span>STEP 03</span><h3>하루 코스 확인하기</h3></div><p>추천 장소를 하루 코스로 연결</p></div>
    <div className="route-intro" data-reveal>
      <div><span className={`route-status ${routeStatusClass}`}><i />{routeStatusLabel}</span><h2>{hasVerifiedStops ? <>{activeProfiles.map((item) => item.label).slice(0, 2).join("·")} 조건으로 찾은<br />{region}의 하루</> : plan ? <>공식 편의근거를 확인한<br />장소가 아직 없습니다.</> : <>여행 조건을 고르면<br />근거 있는 코스를 만듭니다.</>}</h2><p>{region} · {activeTheme} · {activeProfiles.map((item) => item.label).join(" · ")}</p></div>
      <div className="route-metrics"><div><small>추천 지점</small><strong>{activeStops.length}<em>곳</em></strong></div><div><small>걷기 코스</small><strong>{plan?.course?.distance || "공식 정보 미제공"}<em>{plan?.course?.distance ? "km" : ""}</em></strong></div><div><small>확인한 정보</small><strong>{liveCount || "확인 전"}<em>{liveCount ? "개" : ""}</em></strong></div></div>
    </div>
    <div className="itinerary-layout" data-reveal>
      {routeSchedule.length ? <ol className="itinerary-list">{routeSchedule.slice(0, 4).map((entry, index) => <li key={entry.place.id}><span className="stop-time">{entry.startsAtLabel}<small>{travelEvidenceLabel(entry.travelSource, entry.travelMinutes)}</small></span><i className="stop-line" aria-hidden="true"><b>{index + 1}</b></i><div><small>{entry.place.source}</small><h3>{entry.place.title}</h3><p>{entry.place.note} · 체류 {entry.visitMinutes}분, {entry.endsAtLabel} 종료 예정</p></div><span className={`stop-check ${entry.place.evidenceState || "context"}`}>{entry.place.evidenceState === "verified" ? "✓ 공식 편의근거 확인" : entry.place.evidenceState === "limited" ? "! 공식 편의근거 미확인" : "i 추천 맥락만 확인"}</span></li>)}</ol> : <div className="itinerary-empty" role="status"><span aria-hidden="true">!</span><h3>{plan ? "자동 일정을 만들지 않았습니다." : "여행 조건을 먼저 선택해 주세요."}</h3><p>{plan ? "선택한 편의조건과 일치하는 공식 근거가 없어 장소를 임의로 채우지 않았습니다. 조건을 바꾸거나 추가 탐색 장소의 운영기관 정보를 먼저 확인해 주세요." : "지역·테마·편의조건을 고르면 공식 데이터로 확인한 장소만 하루 코스에 연결합니다."}</p></div>}
      <AudioGuidePlayer audio={plan?.audio} controller={audioGuide} />
    </div>
    <div className="share-strip" data-reveal><div><span>여행 계획 저장·공유</span><h3>{hasVerifiedStops ? "지금 만든 코스를 30일 동안 공유 링크로 보관합니다." : "공유할 수 있는 공식 근거 코스가 아직 없습니다."}</h3><p>로그인 없이 이용할 수 있으며 접근성 프로필은 계정 정보와 결합하지 않습니다.</p></div><button type="button" onClick={sharePlan} disabled={!plan || !hasVerifiedStops || shareState === "saving"}>{shareState === "saving" ? "링크 만드는 중" : shareState === "done" ? "링크 복사 완료 ✓" : "공유 링크 만들기"}<span>↗</span></button>{shareState === "error" && <small>공유 저장을 확인해 주세요.</small>}{shareUrl && <a href={shareUrl}>공유 화면 열기</a>}</div>
    {plan?.course && <div className="course-strip" data-reveal><span>두루누비 걷기 코스</span><div><h3>{plan.course.name}</h3><p>{plan.course.summary}</p></div><dl><div><dt>거리</dt><dd>{plan.course.distance}km</dd></div><div><dt>시간</dt><dd>{plan.course.minutes}분</dd></div><div><dt>난이도</dt><dd>{plan.course.level}</dd></div></dl></div>}
  </div>;
}

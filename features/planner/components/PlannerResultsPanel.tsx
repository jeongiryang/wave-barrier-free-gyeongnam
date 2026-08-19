import { profiles, themes } from "../constants";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { ApiStatus, PlanData } from "../types";
import { formatTime } from "../utils";

interface PlannerResultsPanelProps {
  plan: PlanData | null;
  region: string;
  theme: string;
  selectedProfileIds: string[];
  statuses: ApiStatus[];
  liveCount: number;
  audioGuide: ReturnType<typeof useAudioGuide>;
  participation: ReturnType<typeof usePlannerParticipation>;
}

export default function PlannerResultsPanel({
  plan,
  region,
  theme,
  selectedProfileIds,
  statuses,
  liveCount,
  audioGuide,
  participation,
}: PlannerResultsPanelProps) {
  const activeProfiles = profiles.filter((profile) => selectedProfileIds.includes(profile.id));
  const activeTheme = themes.find((item) => item.id === theme)?.label ?? "자연·휴양";
  const activeStops = plan?.stops ?? [];
  const {
    audioRef,
    transcriptOpen,
    playing,
    audioProgress,
    audioTime,
    audioDuration,
    toggleTranscript,
    toggleAudio,
    seekAudio,
    handleLoadedMetadata,
    handleTimeUpdate,
    handlePlay,
    handlePause,
  } = audioGuide;
  const { shareState, shareUrl, sharePlan } = participation;

  return <>
    <section className={`route-section ${plan ? "revealed" : ""}`} id="route">
      <div className="route-intro" data-reveal>
        <div>
          <p className="section-kicker">05 · YOUR W.A.V.E ROUTE</p>
          <span className={`route-status ${plan?.mode ?? "fallback"}`}><i />{plan?.mode === "live" ? "실시간 데이터 반영" : plan?.mode === "partial" ? "일부 데이터 반영" : "코스 미리보기"}</span>
          <h2>{activeProfiles.map((item) => item.label).slice(0, 2).join("·")} 조건으로 찾은<br />{region}의 하루</h2>
          <p>{region} · {activeTheme} · {activeProfiles.map((item) => item.label).join(" · ")}</p>
        </div>
        <div className="route-metrics">
          <div><small>추천 지점</small><strong>{activeStops.length}<em>곳</em></strong></div>
          <div><small>걷기 코스</small><strong>{plan?.course?.distance || "—"}<em>{plan?.course?.distance ? "km" : ""}</em></strong></div>
          <div><small>확인한 정보</small><strong>{liveCount || "—"}<em>{liveCount ? "개" : ""}</em></strong></div>
        </div>
      </div>

      <div className="itinerary-layout" data-reveal>
        <ol className="itinerary-list">
          {activeStops.slice(0, 4).map((stop, index) => <li key={`${stop.title}-${index}`}>
            <span className="stop-time">{["10:30", "12:20", "14:10", "16:00"][index]}</span>
            <i className="stop-line" aria-hidden="true"><b>{index + 1}</b></i>
            <div><small>{stop.source}</small><h3>{stop.title}</h3><p>{stop.note}</p></div>
            <span className={`stop-check ${stop.evidenceState || "context"}`}>{stop.evidenceState === "verified" ? "✓ 편의근거 확인" : stop.evidenceState === "limited" ? "! 방문 전 확인" : "i 추천 맥락"}</span>
          </li>)}
        </ol>

        <aside className="guide-player" aria-label="관광지 오디오 해설">
          <div className="guide-top"><span>여행지 음성 해설</span><b>{plan?.audio ? "재생 가능" : "준비 중"}</b></div>
          <div className="guide-art"><span className={playing ? "sound playing" : "sound"}><i /><i /><i /><i /><i /></span><strong>{plan?.audio?.audioTitle || "여행지 이야기를\n음성과 대본으로"}</strong><small>{plan?.audio ? "실제 오디 해설 데이터" : "해설이 있는 관광지를 선택하면 연결됩니다."}</small></div>
          <audio ref={audioRef} src={plan?.audio?.audioUrl || undefined} onLoadedMetadata={handleLoadedMetadata} onPlay={handlePlay} onPause={handlePause} onEnded={handlePause} onTimeUpdate={handleTimeUpdate} />
          <div className="player-progress"><span style={{ width: `${audioProgress}%` }} /><i style={{ left: `${audioProgress}%` }} /></div>
          <div className="player-time"><span>{formatTime(audioTime)}</span><span>{formatTime(Number(plan?.audio?.playTime || audioDuration || 0))}</span></div>
          <div className="player-controls"><button type="button" aria-label="15초 뒤로" onClick={() => seekAudio(-15)}>↶</button><button className="play-main" type="button" onClick={() => void toggleAudio()} aria-label={playing ? "일시정지" : "재생"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" aria-label="15초 앞으로" onClick={() => seekAudio(15)}>↷</button></div>
          <button className="transcript-button" type="button" onClick={toggleTranscript}>전체 대본 {transcriptOpen ? "접기" : "보기"}<span>청각 정보 지원</span></button>
          {transcriptOpen && <div className="transcript" tabIndex={0}>{plan?.audio?.script || "현재 선택한 여행지의 오디 해설 대본이 없습니다. 실시간 검색 결과에서 해설이 확인되면 이곳에 전체 대본이 표시됩니다."}</div>}
        </aside>
      </div>
      <div className="share-strip" data-reveal>
        <div><span>여행 계획 저장·공유</span><h3>지금 만든 코스를 30일 동안 공유 링크로 보관합니다.</h3><p>로그인 없이 이용할 수 있으며 접근성 프로필은 계정 정보와 결합하지 않습니다.</p></div>
        <button type="button" onClick={sharePlan} disabled={!plan || shareState === "saving"}>{shareState === "saving" ? "링크 만드는 중" : shareState === "done" ? "링크 복사 완료 ✓" : "공유 링크 만들기"}<span>↗</span></button>
        {shareState === "error" && <small>공유 저장을 확인해 주세요.</small>}{shareUrl && <a href={shareUrl}>공유 화면 열기</a>}
      </div>
      {plan?.course && <div className="course-strip" data-reveal><span>두루누비 걷기 코스</span><div><h3>{plan.course.name}</h3><p>{plan.course.summary}</p></div><dl><div><dt>거리</dt><dd>{plan.course.distance}km</dd></div><div><dt>시간</dt><dd>{plan.course.minutes}분</dd></div><div><dt>난이도</dt><dd>{plan.course.level}</dd></div></dl></div>}
    </section>

    <section className="data-section" id="data">
      <div className="data-heading" data-reveal>
        <div><p className="section-kicker">06 · 믿을 수 있는 여행 추천</p><h2>왜 이곳을 추천했는지<br />쉽게 보여드려요.</h2></div>
        <p>선택한 지역·관심사·편의 조건과 최신 관광정보를 함께 비교합니다. 제공기관과 확인 시점을 카드에서 바로 확인할 수 있어요.</p>
      </div>
      <div className="api-bento">
        {statuses.map((status, index) => <article className={`api-card card-${index + 1}`} key={status.id} data-reveal>
          <div><span className={`api-state ${status.state}`}><i />{status.state === "live" ? "최신 정보" : status.state === "empty" ? "정보 없음" : status.state === "error" ? "확인 필요" : "검색 전"}</span><small>{String(index + 1).padStart(2, "0")}</small></div>
          <h3>{status.name}</h3>
          <p>{status.role}</p>
          <footer><span>{status.note}</span><b>{status.count ? `${status.count}건` : "확인 중"}</b></footer>
        </article>)}
        <aside className="trace-card" data-reveal>
          <p>추천이 만들어지는 과정</p>
          <div className="trace-flow"><span>내 여행 조건</span><i>→</i><span>최신 정보 확인</span><i>→</i><span>접근성 비교</span><i>→</i><span>맞춤 코스</span></div>
          <dl><div><dt>여행 지역</dt><dd>경상남도 18개 시·군</dd></div><div><dt>관심사</dt><dd>자연 · 역사 · 레포츠 · 음식</dd></div><div><dt>정보 기준</dt><dd>{plan?.baseYm ? `${plan.baseYm.slice(0, 4)}.${plan.baseYm.slice(4)} 확인` : "검색할 때 최신 정보 확인"}</dd></div><div><dt>개인정보</dt><dd>현재 위치는 기기 안에서만 사용</dd></div></dl>
        </aside>
      </div>
    </section>
  </>;
}

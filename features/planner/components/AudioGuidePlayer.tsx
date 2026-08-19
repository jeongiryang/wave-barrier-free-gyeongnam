import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { PlanData } from "../types";
import { formatTime } from "../utils";

export default function AudioGuidePlayer({ audio, controller }: {
  audio: PlanData["audio"] | null | undefined;
  controller: ReturnType<typeof useAudioGuide>;
}) {
  const {
    audioRef, transcriptOpen, playing, audioProgress, audioTime, audioDuration,
    toggleTranscript, toggleAudio, seekAudio, handleLoadedMetadata, handleTimeUpdate,
    handlePlay, handlePause,
  } = controller;

  return <aside className="guide-player" aria-label="관광지 오디오 해설">
    <div className="guide-top"><span>여행지 음성 해설</span><b>{audio ? "재생 가능" : "준비 중"}</b></div>
    <div className="guide-art"><span className={playing ? "sound playing" : "sound"}><i /><i /><i /><i /><i /></span><strong>{audio?.audioTitle || "여행지 이야기를\n음성과 대본으로"}</strong><small>{audio ? "실제 오디 해설 데이터" : "해설이 있는 관광지를 선택하면 연결됩니다."}</small></div>
    <audio ref={audioRef} src={audio?.audioUrl || undefined} onLoadedMetadata={handleLoadedMetadata} onPlay={handlePlay} onPause={handlePause} onEnded={handlePause} onTimeUpdate={handleTimeUpdate} />
    <div className="player-progress"><span style={{ width: `${audioProgress}%` }} /><i style={{ left: `${audioProgress}%` }} /></div>
    <div className="player-time"><span>{formatTime(audioTime)}</span><span>{formatTime(Number(audio?.playTime || audioDuration || 0))}</span></div>
    <div className="player-controls"><button type="button" aria-label="15초 뒤로" onClick={() => seekAudio(-15)}>↶</button><button className="play-main" type="button" onClick={() => void toggleAudio()} aria-label={playing ? "일시정지" : "재생"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" aria-label="15초 앞으로" onClick={() => seekAudio(15)}>↷</button></div>
    <button className="transcript-button" type="button" onClick={toggleTranscript}>전체 대본 {transcriptOpen ? "접기" : "보기"}<span>청각 정보 지원</span></button>
    {transcriptOpen && <div className="transcript" tabIndex={0}>{audio?.script || "현재 선택한 여행지의 오디 해설 대본이 없습니다. 실시간 검색 결과에서 해설이 확인되면 이곳에 전체 대본이 표시됩니다."}</div>}
  </aside>;
}

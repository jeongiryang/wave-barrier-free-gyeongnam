import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { PlanData } from "../types";
import { formatTime } from "../utils";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";

export default function AudioGuidePlayer({ audio, controller }: {
  audio: PlanData["audio"] | null | undefined;
  controller: ReturnType<typeof useAudioGuide>;
}) {
  const { locale } = useSitePreferences();
  const c = (ko: string, en: string) => locale === "en" ? en : ko;
  const {
    audioRef, transcriptOpen, playing, audioProgress, audioTime, audioDuration,
    toggleTranscript, toggleAudio, seekAudio, handleLoadedMetadata, handleTimeUpdate,
    handlePlay, handlePause,
  } = controller;

  return <aside className="guide-player" aria-label={c("관광지 오디오 해설", "Place audio guide")}>
    <div className="guide-top"><span>{c("여행지 음성 해설", "Place audio guide")}</span><b>{controller.audioError ? c("재생 확인 필요", "Playback unavailable") : audio?.audioUrl ? c("재생 가능", "Audio available") : c("해설 없음", "No audio supplied")}</b></div>
    <div className="guide-art"><span aria-hidden="true" className={playing ? "sound playing" : "sound"}><i /><i /><i /><i /><i /></span><strong lang={audio?.audioTitle ? originalLanguage(audio.audioTitle) : undefined}>{audio?.audioTitle || c("여행지 이야기를\n음성과 대본으로", "Place stories in audio and text")}</strong><small>{audio ? c("한국관광공사 오디 해설", "Korea Tourism Organization audio; the original recording may be in Korean.") : c("추천 여행지에 해당하는 공식 해설을 확인하면 연결됩니다.", "Choose a place with an audio guide to listen here.")}</small></div>
    <audio preload="none" ref={audioRef} src={audio?.audioUrl || undefined} onError={controller.handleAudioError} onLoadedMetadata={handleLoadedMetadata} onPlay={handlePlay} onPause={handlePause} onEnded={handlePause} onTimeUpdate={handleTimeUpdate} />
    {controller.audioError && <p role="alert">{c("오디오를 재생하지 못했습니다. 대본을 확인하거나 재생을 다시 시도해 주세요.", "Audio couldn't play. Read the transcript or try playing it again.")}</p>}
    <div className="player-progress"><span style={{ width: `${audioProgress}%` }} /><i style={{ left: `${audioProgress}%` }} /></div>
    <div className="player-time"><span>{formatTime(audioTime)}</span><span>{formatTime(Number(audio?.playTime || audioDuration || 0))}</span></div>
    <div className="player-controls"><button type="button" disabled={!audio?.audioUrl} aria-label={c("15초 뒤로", "Back 15 seconds")} onClick={() => seekAudio(-15)}>↶</button><button className="play-main" type="button" disabled={!audio?.audioUrl} onClick={() => void toggleAudio()} aria-label={playing ? c("일시정지", "Pause") : c("재생", "Play")}>{playing ? "Ⅱ" : "▶"}</button><button type="button" disabled={!audio?.audioUrl} aria-label={c("15초 앞으로", "Forward 15 seconds")} onClick={() => seekAudio(15)}>↷</button></div>
    <button className="transcript-button" type="button" aria-expanded={transcriptOpen} onClick={toggleTranscript}>{transcriptOpen ? c("대본 접기", "Hide transcript") : c("대본 보기", "Show transcript")}<span>{c("청각 정보 지원", "Text alternative")}</span></button>
    {transcriptOpen && <div className="transcript" tabIndex={0} lang={audio?.script ? originalLanguage(audio.script) : undefined}>{audio?.script || c("이번 추천 여행지에서 확인한 오디 대본이 없습니다. 각 장소의 상세 화면에서도 해설을 찾아볼 수 있어요.", "No transcript was supplied for this place. Available guide text will appear here.")}</div>}
  </aside>;
}

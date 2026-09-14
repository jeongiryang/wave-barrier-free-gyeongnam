'use client';
import { useEffect, useState } from 'react';
import LoadingState from '../../../components/LoadingState';
import { audioGuideKeySentences, audioGuideModeForPreferences, type AudioGuideMode } from '../../../lib/audio-guide-mode.js';
import type { GuidancePreferences } from '../../../lib/guidance-preferences.js';
import { plannerJson } from '../services/api';

type Story = { id: string; title: string; audioTitle: string; audioUrl: string; script: string; playTime: string };

function AudioStory({ story, mode }: { story: Story; mode: AudioGuideMode }) {
  const [failed, setFailed] = useState(false);
  const keySentences = audioGuideKeySentences(story.script);
  return <article><h4>{story.audioTitle}</h4><p>{story.title} · {story.audioUrl ? `약 ${Math.ceil(Number(story.playTime) / 60) || '?'}분 해설` : '대본 제공'}</p>
    {mode === 'audio' && story.audioUrl && <audio aria-label={`${story.audioTitle} 오디오 해설`} controls preload="none" src={story.audioUrl} onError={() => setFailed(true)} onCanPlay={() => setFailed(false)} />}
    {mode === 'audio' && !story.audioUrl && <p>제공된 음원이 없어 대본으로 안내합니다.</p>}
    {failed && <p role="alert">음원에 연결하지 못했어요. 대본으로 바꾸거나 재생을 다시 시도해 주세요.</p>}
    {mode === 'text' && <div className="place-guide-script" role="region" aria-label={`${story.audioTitle} 전체 대본`} tabIndex={0}>{story.script || '제공된 대본이 없어요.'}</div>}
    {mode === 'easy' && <div className="place-guide-script easy" role="region" aria-label={`${story.audioTitle} 핵심 문장`} tabIndex={0}>{keySentences.length ? <ol>{keySentences.map((sentence, index) => <li key={`${story.id}:${index}`}>{sentence}</li>)}</ol> : <p>제공된 대본이 없어요.</p>}<small>Odii 원문에서 앞부분의 핵심 문장만 줄여 보여줍니다. 새로운 사실을 덧붙이지 않습니다.</small></div>}
    {mode === 'audio' && <details><summary>대본도 보기</summary><p tabIndex={0}>{story.script || '제공된 대본이 없어요.'}</p></details>}
  </article>;
}

export default function PlaceAudioGuide({ id, transcript = false, guidance }: { id: string; transcript?: boolean; guidance?: GuidancePreferences }) {
  const [open, setOpen] = useState(transcript), [version, setVersion] = useState(0);
  const preferredMode = transcript ? 'text' : audioGuideModeForPreferences(guidance);
  const [selectedMode, setSelectedMode] = useState<AudioGuideMode | null>(null);
  const mode = selectedMode || preferredMode;
  const [result, setResult] = useState<{ stories: Story[]; checkedAt: string } | null>(null), [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      void plannerJson<{ stories: Story[]; checkedAt: string }>(`/api/wave?action=place-audio&contentId=${encodeURIComponent(id)}`, { signal: controller.signal, timeoutMs: 13000 })
        .then(data => { if (!Array.isArray(data.stories)) throw new Error(); if (!controller.signal.aborted) setResult(data); })
        .catch(() => { if (!controller.signal.aborted) setError('해설을 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, id, version]);
  return <details className="place-audio-guide" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>이 장소의 맞춤 음성·대본 해설</summary>
    {open && <fieldset className="place-guide-modes"><legend>해설 방식</legend>{([['audio','소리로 듣기'],['text','대본 읽기'],['easy','쉬운 설명']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={mode === value} onClick={() => setSelectedMode(value)}>{label}</button>)}</fieldset>}
    {loading ? <LoadingState>Odii 해설과 대본을 확인하고 있어요.</LoadingState> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setVersion(value => value + 1)}>다시 확인</button></div> : result && <>
      {result.stories.length ? result.stories.map((story, index) => <AudioStory key={`${story.id}:${index}`} story={story} mode={mode} />) : <p>이 장소와 일치하는 Odii 해설은 아직 확인하지 못했어요. 장소의 운영 정보와 편의 안내는 계속 볼 수 있습니다.</p>}
      <small>한국관광공사 Odii · {result.checkedAt.slice(0, 10)} 확인</small>
    </>}
  </details>;
}

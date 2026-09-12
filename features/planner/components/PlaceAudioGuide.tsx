'use client';
import { useEffect, useState } from 'react';
import LoadingState from '../../../components/LoadingState';
import { plannerJson } from '../services/api';
type Story = { id: string; title: string; audioTitle: string; audioUrl: string; script: string; playTime: string };
function AudioStory({ story }: { story: Story }) {
  const [failed, setFailed] = useState(false);
  return <article><h4>{story.audioTitle}</h4><p>{story.title} · {story.audioUrl ? `약 ${Math.ceil(Number(story.playTime) / 60) || '?'}분 해설` : '대본 제공'}</p>
    {story.audioUrl && <audio aria-label={`${story.audioTitle} 오디오 해설`} controls preload="none" src={story.audioUrl} onError={() => setFailed(true)} onCanPlay={() => setFailed(false)} />}
    {failed && <p role="alert">음원에 연결하지 못했어요. 아래 대본을 읽거나 재생을 다시 시도해 주세요.</p>}
    <details><summary>대본 보기</summary><p tabIndex={0}>{story.script || '제공된 대본이 없어요.'}</p></details>
  </article>;
}
export default function PlaceAudioGuide({ id }: { id: string }) {
  const [open, setOpen] = useState(false), [version, setVersion] = useState(0);
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
  return <details className="place-audio-guide" open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>이 장소의 음성·대본 해설</summary>
    {loading ? <LoadingState>오디 해설과 대본을 확인하고 있어요.</LoadingState> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setVersion(value => value + 1)}>다시 확인</button></div> : result && <>
      {result.stories.length ? result.stories.map((story, index) => <AudioStory key={`${story.id}:${index}`} story={story} />) : <p>이 장소와 일치하는 오디 해설은 아직 확인하지 못했어요. 장소의 운영 정보와 편의 안내는 계속 볼 수 있습니다.</p>}
      <small>한국관광공사 Odii · {result.checkedAt.slice(0, 10)} 확인</small>
    </>}
  </details>;
}

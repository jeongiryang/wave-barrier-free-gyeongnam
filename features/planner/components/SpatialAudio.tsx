"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Opt-in positioning of supplied audio; never an obstacle or route guide. */
export default function SpatialAudio({
  url,
  title,
  onStart,
}: {
  url: string;
  title: string;
  onStart: () => void;
}) {
  const current = useRef<{
    audio: AudioContext;
    controller: AbortController;
    source?: AudioBufferSourceNode;
    panner?: PannerNode;
  } | null>(null);
  const [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [notice, setNotice] = useState(""),
    [direction, setDirection] = useState("0");
  const dispose = useCallback(() => {
    const run = current.current;
    current.current = null;
    if (run) {
      run.controller.abort();
      run.source?.stop();
      void run.audio.close().catch(() => {});
    }
  }, []);
  const stop = useCallback(() => {
    dispose();
    setPlaying(false);
    setLoading(false);
  }, [dispose]);
  useEffect(() => {
    window.addEventListener("wave-stop-spatial", stop);
    return () => {
      window.removeEventListener("wave-stop-spatial", stop);
      dispose();
    };
  }, [url, dispose, stop]);
  async function play() {
    window.dispatchEvent(new Event("wave-stop-spatial"));
    if (!window.AudioContext) {
      setNotice(
        "공간 음향을 지원하지 않는 브라우저예요. 기본 재생과 대본을 이용해 주세요.",
      );
      return;
    }
    onStart();
    const run = {
      audio: new AudioContext(),
      controller: new AbortController(),
    } as NonNullable<typeof current.current>;
    current.current = run;
    setLoading(true);
    setNotice("");
    const timer = setTimeout(() => run.controller.abort(), 15000);
    try {
      await run.audio.resume();
      const response = await fetch(url, {
        signal: run.controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok || !response.body) throw new Error();
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > 15000000) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(chunk.value);
      }
      const raw = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        raw.set(chunk, offset);
        offset += chunk.length;
      }
      const buffer = await run.audio.decodeAudioData(raw.buffer);
      if (current.current !== run || run.controller.signal.aborted) return;
      const node = run.audio.createBufferSource();
      node.buffer = buffer;
      const position = run.audio.createPanner();
      position.panningModel = "HRTF";
      position.positionX.value = Number(direction);
      position.positionZ.value = -1;
      node.connect(position).connect(run.audio.destination);
      run.panner = position;
      run.source = node;
      node.onended = () => {
        if (current.current === run) {
          current.current = null;
          void run.audio.close().catch(() => {});
          setPlaying(false);
        }
      };
      node.start();
      setPlaying(true);
    } catch {
      if (current.current === run) {
        current.current = null;
        setNotice(
          "공간 음향을 준비하지 못했어요. 기본 재생과 대본을 이용하거나 다시 시도해 주세요.",
        );
        setLoading(false);
      }
      void run.audio.close().catch(() => {});
    } finally {
      clearTimeout(timer);
      if (current.current === run) setLoading(false);
    }
  }
  return (
    <details
      onToggle={(e) => {
        if (!e.currentTarget.open) stop();
      }}
    >
      <summary>선택해서 듣는 공간 음향</summary>
      <p>
        선택한 장소의 공식 해설을 입체적으로 배치해 들어요. 현장 녹음이나 이동
        방향 안내가 아닙니다. 편한 음량으로, 주변 소리를 들을 수 있는 곳에서
        이용해 주세요.
      </p>
      <label>
        해설이 들리는 위치
        <select
          disabled={loading}
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value);
            if (current.current?.panner)
              current.current.panner.positionX.value = Number(e.target.value);
          }}
        >
          <option value="0">앞쪽</option>
          <option value="-1">왼쪽</option>
          <option value="1">오른쪽</option>
        </select>
      </label>
      <button
        type="button"
        disabled={loading || playing}
        onClick={() => void play()}
      >
        {loading ? "음향 준비 중…" : `${title} 공간 음향 듣기`}
      </button>
      <button type="button" disabled={!loading && !playing} onClick={stop}>
        공간 음향 중지
      </button>
      <p role="status">{notice}</p>
    </details>
  );
}

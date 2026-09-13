"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
type Recognition = { lang:string; continuous:boolean; interimResults:boolean; maxAlternatives:number; start:()=>void; stop:()=>void; abort:()=>void; onstart:(()=>void)|null; onaudiostart:(()=>void)|null; onresult:((event:{resultIndex:number;results:ArrayLike<{isFinal:boolean;0:{transcript:string}} >})=>void)|null; onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null; onnomatch:(()=>void)|null; onspeechend:(()=>void)|null };
type Constructor = new()=>Recognition;
export type VoicePhase = 'idle'|'permission'|'starting'|'listening'|'silence'|'processing'|'stopped'|'error';
export function useTravelVoice() {
  const active = useRef<Recognition|null>(null), session = useRef(0), timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const stream = useRef<MediaStream|null>(null), context = useRef<AudioContext|null>(null), frame = useRef(0), finalText = useRef('');
  const audioTicket = useRef(0);
  const [phase, setPhase] = useState<VoicePhase>('idle'), [notice, setNotice] = useState(''), [interim, setInterim] = useState('');
  const [levels, setLevels] = useState<number[]>([]), [waveform, setWaveform] = useState<'waiting'|'live'|'unavailable'>('waiting');
  const releaseAudio = useCallback(() => {
    audioTicket.current++;
    if (frame.current) cancelAnimationFrame(frame.current); frame.current = 0;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    const current = context.current; context.current = null; if (current && current.state !== 'closed') void current.close().catch(() => {});
  }, []);
  const dispose = useCallback(() => {
    session.current++;
    const current = active.current; active.current = null;
    if (timer.current) clearTimeout(timer.current); timer.current = null;
    if (current) { current.onstart = null; current.onaudiostart = null; current.onresult = null; current.onerror = null; current.onend = null; current.onnomatch = null; current.onspeechend = null; try { current.abort(); } catch { /* Already ended. */ } }
    releaseAudio();
  }, [releaseAudio]);
  const cancel = useCallback(() => { const hadSession = Boolean(active.current); dispose(); setPhase('stopped'); setInterim(''); setLevels([]); if (hadSession) setNotice('음성 입력을 취소했어요.'); }, [dispose]);
  useEffect(() => {
    const hide = () => { if (document.hidden && active.current) cancel(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); dispose(); };
  }, [cancel, dispose]);
  function start(onTranscript:(text:string)=>void) {
    if (active.current) return;
    const provider = window as unknown as { SpeechRecognition?:Constructor; webkitSpeechRecognition?:Constructor; webkitAudioContext?:typeof AudioContext };
    const Recognition = provider.SpeechRecognition || provider.webkitSpeechRecognition;
    if (!Recognition) { setPhase('error'); setNotice('이 브라우저는 음성 입력을 지원하지 않아요. 글로 입력해 주세요.'); return; }
    let recognition:Recognition;
    try { recognition = new Recognition(); } catch { setPhase('error'); setNotice('음성 입력을 시작하지 못했어요. 다시 시도하거나 글로 입력해 주세요.'); return; }
    const token = ++session.current, meterToken = audioTicket.current;
    let recognitionStarted = false;
    active.current = recognition; finalText.current = ''; setInterim(''); setLevels([]); setWaveform('waiting');
    recognition.lang = 'ko-KR'; recognition.continuous = false; recognition.interimResults = true; recognition.maxAlternatives = 1;
    const current = () => active.current === recognition && token === session.current;
    const finish = (message:string, error = false, text = '') => {
      if (!current()) return;
      dispose(); setLevels([]); setInterim(''); setPhase(error ? 'error' : 'stopped'); setNotice(message);
      if (text) onTranscript(text.slice(0,1200));
    };
    recognition.onstart = () => { recognitionStarted = true; if (current()) { setPhase('listening'); setNotice('듣고 있어요.'); } };
    recognition.onaudiostart = () => { recognitionStarted = true; if (current()) { setPhase('listening'); setNotice('듣고 있어요.'); } };
    recognition.onresult = event => {
      if (!current()) return;
      let confirmed = '', pending = '';
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index], text = result?.[0]?.transcript || '';
        if (result?.isFinal) confirmed += text; else pending += text;
      }
      finalText.current = confirmed.trim(); setInterim((confirmed + pending).trim().slice(0,1200));
      if (confirmed.length > 1200) { finish('한 번에 1,200자까지 입력할 수 있어요. 나누어 말해 주세요.', true); return; }
      if (confirmed && !pending) finish('들은 말을 확인한 뒤 보내 주세요.', false, confirmed.trim());
    };
    recognition.onerror = event => finish(['not-allowed','service-not-allowed'].includes(event.error) ? '마이크 사용을 허용해 주세요. 글로도 입력할 수 있어요.' : event.error === 'no-speech' ? '음성이 들리지 않았어요. 다시 시도해 주세요.' : '음성 입력을 마치지 못했어요. 연결과 마이크를 확인해 주세요.', true);
    recognition.onnomatch = () => finish('말을 알아듣지 못했어요. 다시 시도하거나 글로 입력해 주세요.', true);
    recognition.onend = () => finish(finalText.current ? '들은 말을 확인한 뒤 보내 주세요.' : '듣기를 마쳤어요. 다시 시작하거나 글로 입력해 주세요.', false, finalText.current);
    recognition.onspeechend = () => { if (current()) { setPhase('processing'); setNotice('들은 말을 정리하고 있어요.'); releaseAudio(); try { recognition.stop(); } catch { finish('음성 입력을 마쳤어요.', false, finalText.current); } } };
    setPhase('permission'); setNotice('마이크 연결을 확인하고 있어요.');
    timer.current = setTimeout(() => finish('듣는 시간이 끝났어요. 다시 시작해 주세요.', false, finalText.current), 45000);
    try { recognition.start(); } catch { finish('마이크를 시작하지 못했어요. 글로 입력해 주세요.', true); return; }
    const Audio = window.AudioContext || provider.webkitAudioContext;
    if (!Audio || !navigator.mediaDevices?.getUserMedia) { setWaveform('unavailable'); return; }
    // Recognition and the visual meter are independent. Raw microphone audio
    // is measured locally and is never recorded, uploaded or played back.
    void navigator.mediaDevices.getUserMedia({ audio: true }).then(async media => {
      if (!current() || audioTicket.current !== meterToken) { media.getTracks().forEach(track => track.stop()); return; }
      if (!recognitionStarted) { setPhase('starting'); setNotice('마이크를 연결했어요. 음성 인식을 시작하고 있어요.'); }
      stream.current = media;
      try {
        const audio = new Audio(); context.current = audio; await audio.resume();
        if (!current() || context.current !== audio) { media.getTracks().forEach(track => track.stop()); if (audio.state !== 'closed') void audio.close(); return; }
        const analyser = audio.createAnalyser(); analyser.fftSize = 512;
        const source = audio.createMediaStreamSource(media); source.connect(analyser);
        const bytes = new Uint8Array(analyser.fftSize);
        setWaveform('live');
        let painted = 0, lastSound = performance.now(), silent = false;
        const measure = (now:number) => {
          if (!current() || context.current !== audio) return;
          if (now - painted >= 80) {
            painted = now; analyser.getByteTimeDomainData(bytes);
            const bars = Array.from({length:24}, (_, i) => { let sum = 0; for (let j = 0; j < 20; j++) { const v = (bytes[i * 20 + j] - 128) / 128; sum += v * v; } return Math.min(1, Math.sqrt(sum / 20) * 5); });
            const loud = bars.some(value => value > .035); if (loud) lastSound = now;
            const nextSilent = now - lastSound > 3000;
            if (nextSilent !== silent) { silent = nextSilent; setPhase(silent ? 'silence' : 'listening'); setNotice(silent ? '소리가 들리지 않아요. 마이크에 가까이 말해 주세요.' : '듣고 있어요.'); }
            setLevels(bars);
          }
          frame.current = requestAnimationFrame(measure);
        };
        frame.current = requestAnimationFrame(measure);
      } catch { releaseAudio(); if (current()) setWaveform('unavailable'); }
    }).catch(() => { if (current()) setWaveform('unavailable'); });
  }
  function stop() {
    const current = active.current; if (!current) return;
    releaseAudio(); setLevels([]); setPhase('processing'); setNotice('들은 말을 정리하고 있어요.');
    try { current.stop(); } catch { cancel(); }
  }
  return { listening: ['permission','starting','listening','silence','processing'].includes(phase), phase, notice, interim, levels, waveform, start, stop, cancel };
}

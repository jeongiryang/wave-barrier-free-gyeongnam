import type { useTravelVoice } from '../hooks/useTravelVoice';
export default function VoiceInputMeter({ voice }: { voice: ReturnType<typeof useTravelVoice> }) {
  if (!voice.listening) return null;
  return <div className="simple-voice-meter" data-phase={voice.phase}>
    {voice.waveform === 'live' && ['listening','silence'].includes(voice.phase) ? <div className="simple-voice-bars" aria-hidden="true">{voice.levels.map((value, index) => <span key={index} style={{ height: `${2 + value * 30}px` }} />)}</div> : <span className="simple-voice-state">{voice.phase === 'permission' ? '마이크 연결 중' : voice.phase === 'processing' ? '음성 처리 중' : '음성 입력 중'}</span>}
    {voice.waveform === 'unavailable' && <small>소리 크기는 표시할 수 없어요.</small>}
    {voice.interim && <p aria-label="인식 중인 말">{voice.interim}</p>}
    <div><button type="button" onClick={voice.stop} disabled={voice.phase === 'processing'}>듣기 완료</button><button type="button" onClick={voice.cancel}>취소</button></div>
  </div>;
}

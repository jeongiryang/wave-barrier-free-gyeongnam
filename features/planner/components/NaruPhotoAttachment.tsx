import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { AssistantPhoto } from '../../../lib/assistant-photo.js';
import { prepareAssistantPhoto } from '../services/assistant-photo';
import styles from './NaruPhotoAttachment.module.css';

export default function NaruPhotoAttachment({ photo, disabled, onChange, onPreparing }: { photo: AssistantPhoto | null; disabled: boolean; onChange: (photo: AssistantPhoto | null) => void; onPreparing: (value: boolean) => void }) {
  const field = useRef<HTMLInputElement>(null), generation = useRef(0);
  const [preparing, setPreparing] = useState(false), [error, setError] = useState('');
  useEffect(() => () => { generation.current++; onPreparing(false); }, [onPreparing]);
  async function choose(file?: File) {
    if (!file) return;
    const id = ++generation.current; setPreparing(true); onPreparing(true); setError('');
    try { const next = await prepareAssistantPhoto(file); if (generation.current === id) onChange(next); }
    catch (error) { if (generation.current === id) setError(error instanceof Error ? error.message : '사진을 준비하지 못했어요.'); }
    finally { if (generation.current === id) { setPreparing(false); onPreparing(false); } }
  }
  return <div className={styles.attachment}>
    <input ref={field} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="나루에게 첨부할 사진 선택" onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
    <button type="button" disabled={disabled || preparing} onClick={() => field.current?.click()} aria-label={photo ? '첨부 사진 바꾸기' : '사진 첨부'}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg>{preparing ? '사진 준비 중…' : photo ? '사진 바꾸기' : '사진 첨부'}</button>
    {photo && <div className={styles.preview}><Image unoptimized src={`data:image/jpeg;base64,${photo.data}`} alt="보내기 전 첨부 사진 미리보기" width={64} height={64} /><span>사진 1장 · 보내기를 누르면 전송</span><button type="button" disabled={disabled} onClick={() => onChange(null)} aria-label="첨부 사진 삭제">×</button></div>}
    {error && <p role="alert">{error}</p>}
    {photo && <p>사진은 위치정보를 제거한 뒤 WAVE AI 서버에서 읽고 저장하지 않아요. 안내문·포스터에서 읽을 내용을 질문해 주세요.</p>}
    {preparing && <span role="status" className="sr-only">사진 크기를 줄이고 위치정보를 제거하고 있어요.</span>}
  </div>;
}

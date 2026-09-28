
import NightIcon from '../../../components/NightIcon';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import type { AssistantPhoto } from '../../../lib/assistant-photo.js';
import { prepareAssistantPhoto } from '../services/assistant-photo';
import styles from './NaruPhotoAttachment.module.css';

export default function NaruPhotoAttachment({ photo, disabled, onChange, onPreparing, remaining = 1, onAddPhotos }: { remaining?: number; onAddPhotos?: (photos: AssistantPhoto[]) => void; photo: AssistantPhoto | null; disabled: boolean; onChange: (photo: AssistantPhoto | null) => void; onPreparing: (value: boolean) => void }) {
  const field = useRef<HTMLInputElement>(null), generation = useRef(0);
  const [enlarged, setEnlarged] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (enlarged && photo) viewer.current?.showModal(); }, [enlarged, photo]);
  const [preparing, setPreparing] = useState(false), [error, setError] = useState('');
  useEffect(() => () => { generation.current++; onPreparing(false); }, [onPreparing]);
  async function choose(files: File[]) {
    if (!files.length || disabled || preparing || remaining < 1) return;
    const id = ++generation.current; setPreparing(true); onPreparing(true); setError('');
    try { const next = await Promise.all(files.slice(0, remaining).map(prepareAssistantPhoto)); if (generation.current === id) { if (onAddPhotos) onAddPhotos(next); else onChange(next[0]); if (files.length > remaining) setError('사진은 최대 3장까지 첨부할 수 있어요.'); } }
    catch (error) { if (generation.current === id) setError(error instanceof Error ? error.message : '사진을 준비하지 못했어요.'); }
    finally { if (generation.current === id) { setPreparing(false); onPreparing(false); } }
  }
  return <div className={styles.attachment}>
    <input ref={field} type="file" multiple={Boolean(onAddPhotos)} accept="image/jpeg,image/png,image/webp" hidden aria-label="나루에게 첨부할 사진 선택" onChange={event => { void choose(Array.from(event.target.files || [])); event.target.value = ''; }} />
    {!photo && <button type="button" disabled={disabled || preparing} onClick={() => field.current?.click()} aria-label={photo ? '첨부 사진 바꾸기' : '사진 첨부'}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></svg>{preparing ? '사진 준비 중…' : photo ? '사진 바꾸기' : '사진 첨부'}</button>}
    {photo && <div className={styles.preview}>
      <button className={styles.thumbnail} type="button" onClick={() => setEnlarged(true)} aria-label="첨부 사진 크게 보기"><Image unoptimized src={`data:image/jpeg;base64,${photo.data}`} alt="첨부 사진" width={240} height={180} /></button>
      <button className={styles.remove} type="button" disabled={disabled} onClick={() => { setEnlarged(false); onChange(null); }} aria-label="첨부 사진 삭제"><NightIcon name="close" size={20}/></button>
    </div>}
    {error && <p role="alert">{error}</p>}
    {enlarged && photo && createPortal(<dialog ref={viewer} className={styles.viewer} aria-label="첨부 사진 크게 보기" onCancel={() => setEnlarged(false)} onClick={event => { if (event.target === event.currentTarget) setEnlarged(false); }}>
      <button type="button" className={styles.viewerClose} onClick={() => setEnlarged(false)} aria-label="사진 크게 보기 닫기" autoFocus><NightIcon name="close" size={28}/></button>
      <Image unoptimized src={`data:image/jpeg;base64,${photo.data}`} alt="첨부한 사진 원본 미리보기" width={1600} height={1200} />
    </dialog>, document.body)}
    {preparing && <span role="status" className="sr-only">사진 크기를 줄이고 위치정보를 제거하고 있어요.</span>}
  </div>;
}

'use client';
import { useRef, useState } from 'react';
import { authClient } from '../../../lib/auth/client';
import { profileName } from '../../../lib/auth/profile.js';
import { Spinner } from '../../../components/LoadingState';

export default function NicknameEditor({ name, onSaved }: { name: string; onSaved?: () => void }) {
  const [value, setValue] = useState(name === '여행자' ? '' : name);
  const [editing, setEditing] = useState(name === '여행자');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const lock = useRef(false);
  return <section aria-label="WAVE 닉네임"><div className="travel-book-actions"><strong>{name || '여행자'}님, 반가워요.</strong><button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>닉네임 {name === '여행자' ? '정하기' : '수정'}</button></div>
    {editing && <form className="auth-form" onSubmit={async event => {
      event.preventDefault(); if (lock.current) return;
      const next = profileName(value); if (!next) { setNotice('문자·숫자와 공백, ._-를 사용해 2~20자로 입력해 주세요.'); return; }
      lock.current = true; setBusy(true); setNotice('');
      try { const response = await authClient.updateUser({ name: next }); if (response.error) throw new Error(); setNotice('닉네임을 저장했어요.'); setEditing(false); onSaved?.(); }
      catch { setNotice('닉네임을 저장하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요.'); }
      finally { lock.current = false; setBusy(false); }
    }}><div className="auth-field"><label htmlFor="wave-nickname">WAVE에서 부를 이름</label><input id="wave-nickname" autoComplete="nickname" maxLength={20} value={value} disabled={busy} onChange={event => setValue(event.target.value)} /><small>실명 대신 편한 이름을 사용해도 좋아요.</small></div><button type="submit" className="auth-submit" disabled={busy}>{busy ? <><Spinner />저장 중</> : '닉네임 저장'}</button></form>}
    <p role="status">{notice}</p>
  </section>;
}

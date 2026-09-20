'use client';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { usePlaceDialogFocus } from '../hooks/usePlaceDialogFocus';

export function useTripTimingConfirmation(warnings: string[], revision: string) {
  const [pending, setPending] = useState<{ revision: string; action: () => void } | null>(null);
  const current = useRef(revision);
  const accepted = useRef('');
  const warningKey = JSON.stringify(warnings);
  useLayoutEffect(() => { current.current = revision; if (!warnings.length) accepted.current = ''; }, [revision, warnings.length]);
  const close = useCallback(() => setPending(null), []);
  const ref = usePlaceDialogFocus(Boolean(pending), close);
  const needsReview = () => warnings.length > 0 && accepted.current !== warningKey;
  function request(action: () => void) {
    if (needsReview()) setPending({ revision, action });
    else action();
  }
  const changed = pending && pending.revision !== revision;
  const confirmation = pending && <dialog ref={ref} className="simple-dialog" aria-labelledby="trip-timing-confirm-title" lang="ko">
    <header><h2 id="trip-timing-confirm-title" tabIndex={-1}>저장·공유 전 일정 확인</h2><button type="button" aria-label="일정 확인 닫기" onClick={close}>×</button></header>
    <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    <p>현재 이동·체류·휴식 시간을 합산했어요. 조회되지 않은 이동시간은 추정값이며, 장소별 운영시간은 이용 정보에서 확인해 주세요.</p>
    {changed && <p role="status">확인하는 동안 일정이 바뀌었어요. 닫은 뒤 현재 일정으로 다시 시도해 주세요.</p>}
    <div className="travel-book-actions"><button type="button" onClick={close}>돌아가서 수정</button><button type="button" disabled={Boolean(changed)} onClick={() => {
      if (pending.revision !== current.current) return;
      accepted.current = warningKey;
      setPending(null);
      pending.action();
    }}>확인하고 계속</button></div>
  </dialog>;
  return { request, confirmation, needsReview };
}

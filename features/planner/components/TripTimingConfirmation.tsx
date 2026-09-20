'use client';
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePlaceDialogFocus } from '../hooks/usePlaceDialogFocus';
import { subscribeVisitInfo, visitInfoVersion, serverVisitInfoVersion } from '../services/visit-info';

export function useTripTimingConfirmation(warnings: string[], revision: string) {
  useSyncExternalStore(subscribeVisitInfo, visitInfoVersion, serverVisitInfoVersion);
  const [pending, setPending] = useState<{ revision: string; action: () => void } | null>(null);
  const accepted = useRef('');
  const warningKey = JSON.stringify(warnings);
  const reviewRevision = JSON.stringify([revision, warningKey]);
  const current = useRef(reviewRevision);
  useLayoutEffect(() => { current.current = reviewRevision; if (!warnings.length) accepted.current = ''; }, [reviewRevision, warnings.length]);
  const close = useCallback(() => setPending(null), []);
  const ref = usePlaceDialogFocus(Boolean(pending), close);
  const needsReview = () => warnings.length > 0 && accepted.current !== warningKey;
  function request(action: () => void) {
    if (needsReview()) setPending({ revision: reviewRevision, action });
    else action();
  }
  const changed = pending && pending.revision !== reviewRevision;
  const confirmation = pending && <dialog ref={ref} className="simple-dialog" aria-labelledby="trip-timing-confirm-title" lang="ko">
    <header><h2 id="trip-timing-confirm-title" tabIndex={-1}>저장·공유 전 일정 확인</h2><button type="button" aria-label="일정 확인 닫기" onClick={close}>×</button></header>
    <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
    <p>현재 이동·체류·휴식 시간과 이미 조회한 운영 정보를 비교했어요. 조회되지 않은 이동시간은 추정값이며, 미확인 운영시간과 당일 변경은 시설에 확인해 주세요.</p>
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

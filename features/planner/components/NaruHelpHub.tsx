"use client";

import { useState } from 'react';
import { NARU_HUB_ITEMS, visibleNaruHubItems } from '../../../lib/naru-hub.js';
import type { NaruHubContext } from '../../../lib/naru-hub';
import type { AssistantTool } from '../../../lib/assistant-actions';

type Props = {
  context: NaruHubContext;
  canTalk: boolean;
  onOpenTool: (tool: AssistantTool) => void;
  onTalk: () => void;
};

/**
 * 대화를 입력하지 않고도 자주 쓰는 도구를 바로 여는 줄.
 * 표시와 버튼 동작만 담당하며 여행 상태는 props로만 받는다.
 * 도구를 연 기록은 어디에도 저장하지 않는다.
 */
export default function NaruHelpHub({ context, canTalk, onOpenTool, onTalk }: Props) {
  const [failed, setFailed] = useState(false);
  const items = visibleNaruHubItems(NARU_HUB_ITEMS, context, 6);
  if (!items.length) return null;
  const open = (tool: AssistantTool) => {
    try {
      onOpenTool(tool);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };
  return <section className="naru-context-suggestions" aria-label="나루 도움 모음" style={{ flexWrap: 'wrap', overflowX: 'visible', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2, 8px)' }}>

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {items.map(item => <button key={item.id} type="button" onClick={() => open(item.tool)}>{item.label}</button>)}
    </div>
    {canTalk && <button type="button" onClick={onTalk} style={{ background: 'var(--accent)', color: '#fff', alignSelf: 'flex-start' }}>직접 이야기하기</button>}
    {failed && <p role="status" aria-live="polite" className="naru-note" style={{ margin: 0, padding: 0 }}>지금은 열 수 없어요.</p>}
  </section>;
}

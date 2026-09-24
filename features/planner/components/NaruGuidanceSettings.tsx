import { useId, useState } from 'react';
import type { GuidancePreferences } from '../../../lib/guidance-preferences.js';
import { usePlaceDialogFocus } from '../hooks/usePlaceDialogFocus';

const choices: { key: keyof GuidancePreferences; title: string; description: string }[] = [
  { key: 'briefAnswers', title: '답변은 짧게', description: '긴 설명보다 중요한 내용부터 간단히 알려줘요.' },
  { key: 'oneAtATime', title: '한 번에 하나씩', description: '여러 질문이나 할 일을 한꺼번에 제안하지 않도록 요청해요.' },
  { key: 'easyNarration', title: '쉬운 말로 설명', description: '어려운 표현을 줄이고 핵심 내용을 풀어서 알려줘요.' },
  { key: 'textFirst', title: '글로 확인하기 편하게', description: '문자로 확인할 수 있는 안내를 우선해요.' },
  { key: 'audioFirst', title: '듣기 편한 문장으로', description: '소리 내 읽기 좋은 짧은 문장으로 답해요. 소리가 자동으로 재생되지는 않아요.' },
];

export default function NaruGuidanceSettings({ value, onApply, onClose }: {
  value: GuidancePreferences; onApply: (value: GuidancePreferences) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const id = useId();
  const ref = usePlaceDialogFocus(true, onClose);
  return <dialog ref={ref} className="naru-guidance-settings" aria-labelledby={`${id}-title`} aria-describedby={`${id}-intro`} onCancel={event => event.stopPropagation()} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
  }}>
    <form onSubmit={event => { event.preventDefault(); onApply(draft); }}>
      <header><h2 id={`${id}-title`} tabIndex={-1}>나루 안내 설정</h2><button type="button" aria-label="안내 설정 닫기" onClick={onClose}>×</button></header>
      <p id={`${id}-intro`}>나루가 어떻게 안내하면 좋을까요? 필요한 것만 골라주세요. 여러 개를 함께 선택할 수 있어요.</p>
      <fieldset><legend>원하는 안내 방식</legend>{choices.map(({ key, title, description }) => <label key={key}>
        <input type="checkbox" checked={Boolean(draft[key])} aria-labelledby={`${id}-${key}-title`} aria-describedby={`${id}-${key}-description`} onChange={event => {
          const next = { ...draft }; if (event.target.checked) next[key] = true; else delete next[key]; setDraft(next);
        }} />
        <span><strong id={`${id}-${key}-title`}>{title}</strong><small id={`${id}-${key}-description`}>{description}</small></span>
      </label>)}</fieldset>
      <button type="button" onClick={() => setDraft({})}>선택 모두 해제</button>
      <p>선택하지 않으면 기본 안내를 사용해요. 적용한 설정은 다음 질문부터 반영됩니다.</p>
      <footer><button type="button" onClick={onClose}>취소</button><button type="submit" className="primary">적용하고 대화로 돌아가기</button></footer>
    </form>
  </dialog>;
}

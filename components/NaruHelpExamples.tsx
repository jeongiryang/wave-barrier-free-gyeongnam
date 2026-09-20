'use client';
import { NARU_HELP } from '../lib/naru-help.js';
import { useOpenNaru } from './NaruContext';
export default function NaruHelpExamples() {
  const open = useOpenNaru();
  return <section className="account-settings naru-help-examples" id="naru-examples"><h2>이럴 때 나루를 써보세요</h2><p>예시를 누르면 대화 입력창에 채워져요. 내 상황에 맞게 고친 뒤 보내세요.</p><div>{NARU_HELP.map(item => <article key={item.id}><h3>{item.title}</h3><button type="button" onClick={() => open(item.example)}>{item.example} →</button><p>{item.result}</p></article>)}</div><p>구체적인 장소의 시간 변경은 바로 반영될 수 있으며 되돌리기로 복원합니다. 새 일정이나 대체 장소는 변경안을 확인한 뒤 적용하세요. 설명이 많으면 “한 번에 하나씩 물어봐줘”라고 요청할 수 있어요.</p></section>;
}

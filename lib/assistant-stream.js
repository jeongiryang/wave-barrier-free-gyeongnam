/**
 * 나루 스트리밍 응답의 말(구분자 앞)과 실행(구분자 뒤)을 나눈다.
 *
 * 전달 방식만 바꾸는 순수 함수다. 제안은 여기서 실행하지 않는다.
 * 구분자 뒤 글자는 전부 모은 뒤 호출자가 groundAssistantProposal →
 * validateAssistantAction 순서로 검증한다. 부분 파싱한 JSON으로 동작을
 * 실행하지 않는다.
 */
export const NARU_PROPOSAL_DELIMITER = '\n<<<PROPOSAL>>>\n';
export const NARU_STREAM_LIMIT = 6000;

/** 청크 경계에 걸친 구분자를 놓치지 않도록 보류할 접미사 길이. */
function holdBack(value, delimiter) {
  const max = Math.min(value.length, delimiter.length - 1);
  for (let size = max; size > 0; size -= 1) if (delimiter.startsWith(value.slice(value.length - size))) return size;
  return 0;
}

/**
 * 제공처 스트림 한 줄에서 글자 조각만 꺼낸다. SSE(`data: {...}`)와 줄 단위
 * JSON을 모두 받아들이며, 알 수 없는 줄은 빈 문자열이다. 제공처 원본 오류
 * 문자열은 꺼내지 않는다.
 */
export function naruStreamDelta(line) {
  if (typeof line !== 'string') return '';
  const text = line.trim().replace(/^data:\s*/, '');
  if (!text || text === '[DONE]' || !text.startsWith('{')) return '';
  let frame;
  try { frame = JSON.parse(text); } catch { return ''; }
  if (!frame || typeof frame !== 'object') return '';
  const choice = Array.isArray(frame.choices) ? frame.choices[0] : null;
  const candidates = [choice?.delta?.content, choice?.message?.content, choice?.text, frame.message?.content, frame.response, frame.delta];
  const value = candidates.find(item => typeof item === 'string' && item);
  return typeof value === 'string' ? value : '';
}

/**
 * 도착하는 글자를 받아 흘려보낼 부분만 돌려준다.
 *
 * - 첫 글자가 `{` 또는 코드블록이면 기존 `{reply, proposal}` JSON으로 보고
 *   아무것도 흘려보내지 않는다(기존 파싱으로 되돌아가는 길).
 * - 구분자가 두 번 이상 나오면 첫 번째만 구분자로 본다. 나머지는 제안 본문에
 *   그대로 남고, 파싱에 실패하면 호출자가 제안을 버린다.
 * - 누적 길이가 limit을 넘으면 거기서 끊는다.
 */
export function createNaruStreamReader({ limit = NARU_STREAM_LIMIT, delimiter = NARU_PROPOSAL_DELIMITER } = {}) {
  let mode = 'unknown';
  let raw = '';
  let pending = '';
  let reply = '';
  let proposalText = null;
  let truncated = false;

  return {
    get mode() { return mode; },
    get truncated() { return truncated; },
    push(chunk) {
      if (typeof chunk !== 'string' || !chunk || truncated) return '';
      let value = chunk;
      if (raw.length + value.length > limit) { value = value.slice(0, Math.max(0, limit - raw.length)); truncated = true; }
      if (!value) return '';
      raw += value;
      if (proposalText !== null) { proposalText += value; return ''; }
      pending += value;
      if (mode === 'unknown') {
        const seen = pending.replace(/^\s+/, '');
        if (seen) mode = seen.startsWith('{') || seen.startsWith('`') ? 'json' : 'text';
      }
      if (mode !== 'text') return '';
      const at = pending.indexOf(delimiter);
      if (at >= 0) {
        const text = pending.slice(0, at);
        proposalText = pending.slice(at + delimiter.length);
        pending = '';
        reply += text;
        return text;
      }
      const hold = holdBack(pending, delimiter);
      if (pending.length <= hold) return '';
      const text = pending.slice(0, pending.length - hold);
      pending = pending.slice(pending.length - hold);
      reply += text;
      return text;
    },
    finish() {
      if (mode === 'unknown') mode = 'json';
      let text = '';
      if (mode === 'text' && proposalText === null && pending) { text = pending; reply += pending; pending = ''; }
      return { mode, text, reply, proposalText, raw, truncated };
    },
  };
}

/**
 * 나루 답변 스트림(줄 단위 JSON)을 읽는다. 글자는 도착하는 대로 넘기고,
 * 제안은 `done` 프레임이 도착한 뒤에만 돌려준다. 끊긴 스트림은 오류를 만들지
 * 않고 받은 글자를 그대로 돌려준다.
 */
export type NaruStreamOutcome = { done: boolean; text: string; reply: string; proposal: unknown; source: string };

export function isNaruStream(response: Response) {
  return (response.headers.get('content-type') || '').includes('x-ndjson') && Boolean(response.body);
}

export async function readNaruStream(response: Response, onText: (value: string) => void): Promise<NaruStreamOutcome> {
  const empty = { done: false, text: '', reply: '', proposal: null, source: 'local-llm' };
  if (!response.body) return empty;
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', text = '', received = 0;
  let settled: NaruStreamOutcome | null = null;
  try {
    while (true) {
      const chunk = await reader.read();
      received += chunk.value?.length || 0;
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (received > 200000 || buffer.length > 100000) throw new Error('oversized');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'text' && typeof event.value === 'string') { text += event.value; onText(event.value); }
        // 제안은 전부 도착한 뒤에만 읽는다. 도착 중에는 카드를 그리지 않는다.
        if (event.type === 'done') settled = { done: true, text, reply: typeof event.reply === 'string' ? event.reply : text, proposal: event.proposal ?? null, source: typeof event.source === 'string' ? event.source : 'local-llm' };
      }
      if (chunk.done) break;
    }
  } catch {
    // 끊긴 스트림은 받은 글자를 남긴다. 새 오류 코드를 만들지 않는다.
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  return settled ? { ...settled, text } : { ...empty, text };
}

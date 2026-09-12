import type { AssistantAction } from '../../../lib/assistant-actions.js';
import type { NaruJourney } from '../../../lib/naru-journey.js';

export async function requestNaruJourney(action: AssistantAction, context: object, signal: AbortSignal, onProgress: (phase: string, text: string) => void): Promise<NaruJourney> {
  const response = await fetch('/api/assistant/journey', { method: 'POST', credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, context }) });
  if (!response.ok || !response.body) throw new Error(response.status === 429 ? 'busy' : 'unavailable');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', received = 0, result: NaruJourney | undefined;
  try {
    while (true) {
      const chunk = await reader.read();
      received += chunk.value?.length || 0;
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      if (received > 800000 || buffer.length > 400000) throw new Error('oversized');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'progress' && typeof event.text === 'string') onProgress(event.phase, event.text);
        if (event.type === 'error') throw new Error('preparation');
        if (event.type === 'result' && event.draft && Array.isArray(event.draft.stops)) result = event.draft;
      }
      if (chunk.done) break;
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  if (!result || signal.aborted) throw new Error('incomplete');
  return result;
}

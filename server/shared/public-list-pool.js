/** Only normalized public tourism lists enter this bounded, process-local cache. */
export function createPublicListPool({ concurrency = 3, ttlMs = 300_000, maxEntries = 128, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map(), queue = [];
  let active = 0;
  const abortError = () => new DOMException('Request aborted', 'AbortError');
  function drain() {
    while (active < concurrency && queue.length) {
      const job = queue.shift();
      if (!job.listeners.size || job.controller.signal.aborted) { if (pending.get(job.key) === job) pending.delete(job.key); continue; }
      active++;
      void Promise.resolve().then(() => job.load(job.controller.signal)).then(value => {
        if (job.controller.signal.aborted) throw abortError();
        if (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
        cache.set(job.key, { value: structuredClone(value), expires: now() + ttlMs });
        for (const listener of job.listeners) listener.resolve(structuredClone(value));
      }).catch(error => { for (const listener of job.listeners) listener.reject(error); }).finally(() => {
        for (const listener of job.listeners) listener.cleanup();
        job.listeners.clear();
        if (pending.get(job.key) === job) pending.delete(job.key);
        active--; drain();
      });
    }
  }
  return function run(key, load, signal) {
    if (signal?.aborted) return Promise.reject(abortError());
    const saved = cache.get(key);
    if (saved && saved.expires > now()) return Promise.resolve(structuredClone(saved.value));
    if (saved) cache.delete(key);
    let job = pending.get(key);
    if (!job || job.controller.signal.aborted) {
      job = { key, load, controller: new AbortController(), listeners: new Set() };
      pending.set(key, job); queue.push(job);
    }
    const result = new Promise((resolve, reject) => {
      const listener = { resolve, reject, cleanup: () => signal?.removeEventListener('abort', abort) };
      const abort = () => {
        listener.cleanup(); job.listeners.delete(listener); reject(abortError());
        if (!job.listeners.size) {
          job.controller.abort();
          const index = queue.indexOf(job); if (index >= 0) queue.splice(index, 1);
          if (pending.get(key) === job) pending.delete(key);
        }
      };
      job.listeners.add(listener); signal?.addEventListener('abort', abort, { once: true });
    });
    drain(); return result;
  };
}

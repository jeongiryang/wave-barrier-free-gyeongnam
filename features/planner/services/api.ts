import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";

/** 경로를 지정하지 않은 호출은 가장 긴 예산을 쓴다. 짧게 잡아 성공 응답을 버리는 쪽이 더 나쁘다. */
const DEFAULT_TIMEOUT_MS = Math.max(...Object.values(CLIENT_BUDGET_MS));

export class PlannerRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PlannerRequestError";
  }
}

type JsonRequest = Omit<RequestInit, "body"> & { body?: unknown; timeoutMs?: number };

export async function plannerJson<T>(url: string, options: JsonRequest = {}): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, signal: parentSignal, headers, ...init } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abort, { once: true });
  const timer = window.setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as T & { error?: string };
    if (!response.ok) throw new PlannerRequestError(data.error || "여행 정보를 불러오지 못했습니다.", response.status);
    return data;
  } finally {
    window.clearTimeout(timer);
    parentSignal?.removeEventListener("abort", abort);
  }
}

export async function optionalPlannerJson<T>(url: string, options: JsonRequest = {}) {
  try {
    return await plannerJson<T>(url, options);
  } catch {
    return null;
  }
}

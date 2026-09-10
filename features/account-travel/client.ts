export class AccountTravelError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function travelRequest<T>(path = "", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/account/travel${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", signal,
    headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new AccountTravelError(result?.error || "여행 서비스에 연결하지 못했습니다.", response.status);
  return result as T;
}

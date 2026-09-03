import { json } from "../shared/http";
import { recordOperationalEvent } from "../shared/observability";
import { sweepExpiredAccountDeletionGrants } from "../../features/community/server/account-repository";
import { communityDatabase } from "../../features/community/server/database";
import { ensureTripDatabase, sweepExpiredFeedback, sweepExpiredTrips } from "./database";

async function sameToken(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(actualHash);
  const right = new Uint8Array(expectedHash);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export async function handleTripRetention(request: Request) {
  if (request.method !== "GET" || process.env.VERCEL_ENV !== "production") {
    return json({ error: "지원하지 않는 경로입니다." }, 404);
  }
  const expected = process.env.CRON_SECRET?.trim() || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (expected.length < 32 || !supplied || !(await sameToken(supplied, expected))) {
    return json({ error: "지원하지 않는 경로입니다." }, 404);
  }

  const [sql, communitySql] = await Promise.all([ensureTripDatabase(), communityDatabase()]);
  if (!sql || !communitySql) return json({ error: "보관 기간 정리 기능을 준비 중입니다." }, 503);
  try {
    const [deleted, deletedFeedback, expiredAccountDeletionGrants] = await Promise.all([
      sweepExpiredTrips(sql),
      sweepExpiredFeedback(sql),
      sweepExpiredAccountDeletionGrants(communitySql),
    ]);
    recordOperationalEvent("trip_retention", { status: "success", trigger: "cron", deleted, deletedFeedback, expiredAccountDeletionGrants });
    return json({ ok: true, deleted, deletedFeedback, expiredAccountDeletionGrants });
  } catch {
    recordOperationalEvent("trip_retention", { status: "failed", trigger: "cron" });
    return json({ error: "공유 여행 보관 기간 정리에 실패했습니다." }, 500);
  }
}

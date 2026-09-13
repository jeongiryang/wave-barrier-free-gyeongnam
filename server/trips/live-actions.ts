import { optionalCommunityUser } from '../../features/community/server/session';
import { liveSharePayload, shareCookie, shareCookieName, shareSecretHash, LIVE_SHARE_LIFETIME } from '../../lib/trips/live-share.js';
import { ensureTripDatabase } from './database';
import { sharedTripWriteRejection } from './write-budget';
import { json } from '../shared/http';

export async function writeLiveTrip(request: Request, body: Record<string, unknown>, id = '') {
  const sql = await ensureTripDatabase();
  if (!sql) return json({ error: '공유 링크 저장소에 연결하지 못했어요.' }, 503);
  const user = await optionalCommunityUser(request);
  const now = Date.now();
  const revoke = body.operation === 'revoke';
  const status = body.operation === 'status';
  let payload;
  try { payload = revoke || status ? null : liveSharePayload(body); }
  catch (error) { return json({ error: error instanceof Error ? error.message : '공유할 일정을 확인해 주세요.' }, 400); }
  if (!id) {
    if (revoke || status) return json({ error: '공유 링크를 확인해 주세요.' }, 400);
    const rejection = await sharedTripWriteRejection(sql); if (rejection) return rejection;
    const shareId = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, '0')).join('');
    const hash = await shareSecretHash(secret);
    const expiresAt = now + LIVE_SHARE_LIFETIME;
    await sql`INSERT INTO itineraries (id, payload, created_at, expires_at, live, revision, owner_id, manage_hash, revoked) VALUES (${shareId}, ${JSON.stringify(payload)}::jsonb, ${now}, ${expiresAt}, TRUE, 1, ${user?.id || null}, ${hash}, FALSE)`;
    const response = json({ id: shareId, url: `${new URL(request.url).origin}/trip/${shareId}`, revision: 1, expiresAt, live: true }, 201);
    response.headers.append('Set-Cookie', `${shareCookieName(shareId)}=${secret}; Path=/api/trips; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(LIVE_SHARE_LIFETIME / 1000)}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`);
    return response;
  }
  if (!/^[a-f\d]{12}$/.test(id) || !status && (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1)) return json({ error: '공유 링크의 버전을 확인해 주세요.' }, 400);
  const rows = await sql`SELECT revision, owner_id, manage_hash, expires_at FROM itineraries WHERE id = ${id} AND live = TRUE AND revoked = FALSE AND expires_at > ${now} LIMIT 1` as Array<{ revision: number; owner_id: string | null; manage_hash: string | null; expires_at: string | number }>;
  const row = rows[0];
  const hash = await shareSecretHash(shareCookie(request, id));
  if (!row || !(user?.id && row.owner_id === user.id || hash && row.manage_hash === hash)) return json({ error: '이 링크를 수정할 권한이 없거나 공유가 종료됐어요.' }, 403);
  if (status) return json({ id, revision: Number(row.revision), expiresAt: Number(row.expires_at), live: true });
  const updated = revoke
    ? await sql`UPDATE itineraries SET revoked = TRUE, revision = revision + 1 WHERE id = ${id} AND revision = ${Number(body.revision)} AND revoked = FALSE AND expires_at > ${Date.now()} RETURNING revision`
    : await sql`UPDATE itineraries SET payload = ${JSON.stringify(payload)}::jsonb, revision = revision + 1 WHERE id = ${id} AND revision = ${Number(body.revision)} AND revoked = FALSE AND expires_at > ${Date.now()} RETURNING revision`;
  if (!updated.length) return json({ error: '다른 곳에서 공유 일정이 바뀌었어요. 원본을 확인한 뒤 다시 공유해 주세요.' }, 409);
  return json({ id, url: `${new URL(request.url).origin}/trip/${id}`, revision: Number(updated[0].revision), expiresAt: Number(row.expires_at), live: true, revoked: revoke });
}

import { optionalCommunityUser } from "../../features/community/server/session";
import {
  companionSnapshot,
  editCompanionStop,
  transportExpense,
  type CompanionSelections,
  type CompanionEdit,
  type Expense,
} from "../../lib/experience.js";
import { newInviteToken } from "../../lib/account-travel/model.js";
import { shareSecretHash } from "../../lib/trips/live-share.js";
import { rateLimitResponse } from "../../lib/rate-limit-response.js";
import { json, readTrustedJson } from "../shared/http";
import { experienceDatabase } from "./experience-database";

type Role = "owner" | "editor" | "proposer" | "viewer";
type Proposal = { id: string; edit: CompanionEdit; revision: number };
export type CompanionPayload = {
  selections: CompanionSelections;
  expenses: Array<Expense & { id: string }>;
  proposals: Proposal[];
  history: Array<{ at: number; role: Role; label: string }>;
};
type Row = {
  owner_id: string;
  payload: CompanionPayload;
  tokens: Record<string, string>;
  revision: number;
  expires_at: string | number;
  id: string;
};
const LIFETIME = 30 * 86400000;

export async function handleCompanions(request: Request) {
  try {
    if (!["GET", "POST"].includes(request.method))
      return json({ error: "지원하지 않는 요청입니다." }, 405);
    const url = new URL(request.url),
      id = url.pathname.split("/")[3] || "";
    if (id && !/^[a-f0-9]{24}$/.test(id))
      return json({ error: "초대 주소를 확인해 주세요." }, 404);
    const parsed =
      request.method === "POST" ? await readTrustedJson(request, 24000) : null;
    if (parsed?.response) return parsed.response;
    const body = parsed?.body || {},
      user = await optionalCommunityUser(request);
    const sql = await experienceDatabase();
    if (!sql)
      return json({ error: "동행 일정 저장소에 연결하지 못했어요." }, 503);
    const now = Date.now();
    if (!id) {
      if (request.method !== "POST" || !user)
        return json(
          { error: "동행 일정 만들기는 로그인 후 이용해 주세요." },
          401,
        );
      let selections;
      try {
        selections = companionSnapshot(body.selections);
      } catch (error) {
        return json({ error: (error as Error).message }, 400);
      }
      const count =
        await sql`SELECT COUNT(*) AS count FROM wave_companions WHERE owner_id = ${user.id} AND created_at > ${now - 86400000}`;
      if (Number(count[0]?.count) >= 10)
        return rateLimitResponse(
          "하루에 동행 일정 10개까지 만들 수 있어요.",
          86400,
        );
      const roomId = crypto.randomUUID().replaceAll("-", "").slice(0, 24),
        expiresAt = now + LIFETIME;
      const payload: CompanionPayload = {
        selections,
        expenses: [],
        proposals: [],
        history: [{ at: now, role: "owner", label: "동행 일정 시작" }],
      };
      await sql`INSERT INTO wave_companions (id, owner_id, payload, tokens, revision, created_at, expires_at) VALUES (${roomId}, ${user.id}, ${JSON.stringify(payload)}::jsonb, '{}'::jsonb, 1, ${now}, ${expiresAt})`;
      return json(
        { id: roomId, revision: 1, expiresAt, role: "owner", ...payload },
        201,
      );
    }
    const rows =
      (await sql`SELECT id, owner_id, payload, tokens, revision, expires_at FROM wave_companions WHERE id = ${id} AND revoked = FALSE AND expires_at > ${now} LIMIT 1`) as Row[];
    const row = rows[0];
    if (!row)
      return json(
        { error: "동행 일정이 종료됐거나 보관 기간이 지났어요." },
        404,
      );
    const cookieName = `wave-companion-${id}`;
    const supplied =
      body.operation === "join"
        ? body.token
        : (request.headers.get("cookie") || "")
            .split(";")
            .map((v) => v.trim())
            .find((v) => v.startsWith(`${cookieName}=`))
            ?.slice(cookieName.length + 1);
    const hash = await shareSecretHash(supplied);
    const invited = (["editor", "proposer", "viewer"] as const).find(
      (role) => hash && row.tokens[role] === hash,
    );
    const role: Role | undefined =
      user?.id === row.owner_id ? "owner" : invited;
    if (!role)
      return json(
        {
          error: "초대 링크로 들어오거나 일정을 만든 계정으로 로그인해 주세요.",
        },
        403,
      );
    const state = () => ({
      id,
      role,
      revision: Number(row.revision),
      expiresAt: Number(row.expires_at),
      ...row.payload,
    });
    if (request.method === "GET") return json(state());
    if (body.operation === "join") {
      if (!invited) return json(state());
      const response = json(state());
      response.headers.append(
        "Set-Cookie",
        `${cookieName}=${supplied}; Path=/api/companions/${id}; HttpOnly; SameSite=Strict; Max-Age=${Math.floor((Number(row.expires_at) - now) / 1000)}${url.protocol === "https:" ? "; Secure" : ""}`,
      );
      return response;
    }
    if (
      !Number.isSafeInteger(body.revision) ||
      body.revision !== Number(row.revision)
    )
      return json(
        {
          error:
            "다른 동행이 먼저 수정했어요. 새 내용을 확인한 뒤 다시 적용해 주세요.",
        },
        409,
      );
    if (role === "viewer")
      return json({ error: "이 초대는 읽기 전용입니다." }, 403);
    if (role === "proposer" && body.operation !== "propose")
      return json(
        {
          error: "변경 제안을 보내면 편집 권한이 있는 동행이 반영할 수 있어요.",
        },
        403,
      );
    if (
      ["invite", "revoke", "cancel-invites"].includes(String(body.operation)) &&
      role !== "owner"
    )
      return json(
        { error: "초대 관리는 일정을 만든 사람만 할 수 있어요." },
        403,
      );
    const payload = structuredClone(row.payload),
      tokens = { ...row.tokens };
    let label = "",
      invitation = "",
      revoked = false;
    try {
      if (body.operation === "invite") {
        if (!["viewer", "proposer", "editor"].includes(String(body.role)))
          throw new Error("초대 권한을 선택해 주세요.");
        const secret = newInviteToken();
        tokens[String(body.role)] = await shareSecretHash(secret);
        invitation = `${url.origin}/companion/${id}#invite=${secret}`;
        label = `${body.role === "editor" ? "편집" : body.role === "proposer" ? "제안" : "보기"} 초대 갱신`;
      } else if (body.operation === "cancel-invites") {
        Object.keys(tokens).forEach((key) => delete tokens[key]);
        label = "모든 초대 권한 종료";
      } else if (body.operation === "revoke") {
        revoked = true;
        label = "동행 일정 종료";
      } else if (body.operation === "edit") {
        payload.selections = editCompanionStop(
          payload.selections,
          body.edit as CompanionEdit,
        );
        label = "방문 시간·순서 수정";
      } else if (body.operation === "propose") {
        editCompanionStop(payload.selections, body.edit as CompanionEdit);
        if (payload.proposals.length >= 12)
          throw new Error("대기 중인 제안을 먼저 정리해 주세요.");
        const raw = body.edit as CompanionEdit;
        const edit: CompanionEdit = raw.direction
          ? { id: raw.id, direction: raw.direction }
          : {
              id: raw.id,
              minutes: raw.minutes,
              breakMinutes: raw.breakMinutes,
            };
        payload.proposals.push({
          id: crypto.randomUUID(),
          edit,
          revision: Number(row.revision) + 1,
        });
        label = "방문 변경 제안";
      } else if (body.operation === "accept" || body.operation === "dismiss") {
        const proposal = payload.proposals.find(
          (p) => p.id === body.proposalId,
        );
        if (!proposal) throw new Error("이미 처리된 제안입니다.");
        if (body.operation === "accept") {
          if (proposal.revision !== Number(row.revision))
            throw new Error(
              "제안 뒤 일정이나 동행 기록이 바뀌었어요. 최신 일정에서 다시 제안해 주세요.",
            );
          payload.selections = editCompanionStop(
            payload.selections,
            proposal.edit,
          );
        }
        payload.proposals = payload.proposals.filter(
          (p) => p.id !== proposal.id,
        );
        label =
          body.operation === "accept" ? "동행 제안 적용" : "동행 제안 닫기";
      } else if (body.operation === "expense") {
        const expense = transportExpense(
          body.expense,
          payload.selections.selectedPlaceIds,
        );
        const expenseId =
          typeof body.expenseId === "string"
            ? body.expenseId
            : crypto.randomUUID();
        if (body.expenseId && !payload.expenses.some((e) => e.id === expenseId))
          throw new Error("수정할 이동 기록이 없습니다.");
        if (!body.expenseId && payload.expenses.length >= 30)
          throw new Error("이동 기록은 30개까지 저장할 수 있어요.");
        payload.expenses = [
          ...payload.expenses.filter((e) => e.id !== expenseId),
          { id: expenseId, ...expense },
        ];
        label = "이동 상태·분담 기록";
      } else if (body.operation === "remove-expense") {
        payload.expenses = payload.expenses.filter(
          (e) => e.id !== body.expenseId,
        );
        label = "이동 기록 삭제";
      } else throw new Error("지원하지 않는 변경입니다.");
    } catch (error) {
      return json({ error: (error as Error).message }, 400);
    }
    // Bound history and write frequency; revision compare makes every update atomic.
    if (payload.history.filter((item) => item.at > now - 60000).length >= 30)
      return rateLimitResponse(
        "변경이 많아 잠시 쉬고 있어요. 1분 뒤 다시 시도해 주세요.",
        60,
      );
    payload.history = [{ at: now, role, label }, ...payload.history].slice(
      0,
      50,
    );
    const updated =
      await sql`UPDATE wave_companions SET payload = ${JSON.stringify(payload)}::jsonb, tokens = ${JSON.stringify(tokens)}::jsonb, revision = revision + 1, revoked = ${revoked} WHERE id = ${id} AND revision = ${Number(row.revision)} AND revoked = FALSE AND expires_at > ${Date.now()} RETURNING revision`;
    if (!updated.length)
      return json(
        {
          error:
            "다른 동행이 먼저 수정했어요. 새 내용을 확인한 뒤 다시 적용해 주세요.",
        },
        409,
      );
    return json({
      ...state(),
      ...payload,
      revision: Number(updated[0].revision),
      invitation,
      revoked,
    });
  } catch {
    return json(
      {
        error:
          "동행 일정에 연결하지 못했어요. 입력한 내용을 유지하고 다시 시도해 주세요.",
      },
      502,
    );
  }
}

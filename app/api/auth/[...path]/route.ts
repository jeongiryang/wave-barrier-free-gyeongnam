import { getAuth } from "../../../../lib/auth/server";
import { privateAuthResponse } from "../../../../lib/auth/private-response.js";
import { verifySameOriginMutation } from "../../../../lib/server-request";
import { profileUpdateBody } from '../../../../lib/auth/profile.js';

type RouteContext = { params: Promise<{ path: string[] }> };

function configuredHandlers() {
  return getAuth()?.handler() ?? null;
}

async function unavailable() {
  return privateAuthResponse(Response.json({ error: "로그인 기능을 준비 중입니다." }, {
    status: 503,
    headers: { "X-Content-Type-Options": "nosniff" },
  }));
}

async function failed() {
  return privateAuthResponse(Response.json({ error: "계정 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, {
    status: 502,
    headers: { "X-Content-Type-Options": "nosniff" },
  }));
}

async function runHandler(request: Request, context: RouteContext, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") {
  const nativeCallback = process.env.WAVE_AUTH_BACKEND === "native" && method === "GET"
    && new URL(request.url).pathname === "/api/auth/callback/kakao";
  const callbackFailure = () => privateAuthResponse(Response.redirect(new URL("/login?error=kakao", request.url), 303));
  try {
    if (process.env.WAVE_AUTH_BACKEND === "native") {
      const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
      const get = /^\/(get-session|list-accounts|list-sessions|callback\/kakao|verify-email|delete-user\/callback|reset-password\/[A-Za-z0-9_-]+)$/;
      const post = /^\/(sign-in\/(email|social)|sign-up\/email|sign-out|request-password-reset|reset-password|change-password|link-social|unlink-account|revoke-session|revoke-sessions|revoke-other-sessions|update-user)$/;
      if (method === "GET" && path === "/error") return privateAuthResponse(Response.redirect(new URL("/login?error=kakao", request.url), 303));
      // Delete requests go through /api/account so a service-data cleanup grant always exists.
      // Provider tokens and unimplemented administrative/profile routes are never public.
      if (!(method === "GET" ? get.test(path) : method === "POST" && post.test(path))) {
        return privateAuthResponse(Response.json({ error: "지원하지 않는 계정 요청입니다." }, { status: 404 }));
      }
    }
    const handlers = configuredHandlers();
    if (!handlers) return unavailable();
    const response = await handlers[method](request, context);
    if (nativeCallback && response.status >= 400) return callbackFailure();
    return response.status >= 500 ? failed() : privateAuthResponse(response);
  } catch {
    if (nativeCallback) return callbackFailure();
    return failed();
  }
}

const AUTH_BODY_LIMIT = 64 * 1024;

async function guardedMutation(request: Request, context: RouteContext, method: "POST" | "PUT" | "PATCH" | "DELETE") {
  const guard = await verifySameOriginMutation(request, AUTH_BODY_LIMIT);
  if (guard) return privateAuthResponse(guard);
  if (new URL(request.url).pathname === '/api/auth/update-user') {
    const body = profileUpdateBody(await request.clone().json().catch(() => null));
    if (method !== 'POST' || !body) return privateAuthResponse(Response.json({ error: '닉네임은 문자·숫자와 공백, ._-를 사용해 2~20자로 입력해 주세요.' }, { status: 400 }));
    const headers = new Headers(request.headers); headers.delete('content-length');
    request = new Request(request, { headers, body: JSON.stringify(body) });
  }
  return runHandler(request, context, method);
}

export async function GET(request: Request, context: RouteContext) {
  return runHandler(request, context, "GET");
}

export async function POST(request: Request, context: RouteContext) {
  return guardedMutation(request, context, "POST");
}

export async function PUT(request: Request, context: RouteContext) {
  return guardedMutation(request, context, "PUT");
}

export async function DELETE(request: Request, context: RouteContext) {
  return guardedMutation(request, context, "DELETE");
}

export async function PATCH(request: Request, context: RouteContext) {
  return guardedMutation(request, context, "PATCH");
}

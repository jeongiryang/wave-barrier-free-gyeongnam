import { getAuth } from "../../../../lib/auth/server";
import { privateAuthResponse } from "../../../../lib/auth/private-response.js";
import { verifySameOriginMutation } from "../../../../lib/server-request";

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
  try {
    const handlers = configuredHandlers();
    if (!handlers) return unavailable();
    const response = await handlers[method](request, context);
    return response.status >= 500 ? failed() : privateAuthResponse(response);
  } catch {
    return failed();
  }
}

const AUTH_BODY_LIMIT = 64 * 1024;

async function guardedMutation(request: Request, context: RouteContext, method: "POST" | "PUT" | "PATCH" | "DELETE") {
  const guard = await verifySameOriginMutation(request, AUTH_BODY_LIMIT);
  if (guard) return privateAuthResponse(guard);
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

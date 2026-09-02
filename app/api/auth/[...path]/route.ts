import { getAuth } from "../../../../lib/auth/server";
import { verifySameOriginMutation } from "../../../../lib/server-request";

type RouteContext = { params: Promise<{ path: string[] }> };

function configuredHandlers() {
  return getAuth()?.handler() ?? null;
}

async function unavailable() {
  return Response.json({ error: "로그인 기능을 준비 중입니다." }, {
    status: 503,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

const AUTH_BODY_LIMIT = 64 * 1024;

async function guardedMutation(request: Request, context: RouteContext, method: "POST" | "PUT" | "PATCH" | "DELETE") {
  const guard = await verifySameOriginMutation(request, AUTH_BODY_LIMIT);
  if (guard) return guard;
  const handlers = configuredHandlers();
  return handlers ? handlers[method](request, context) : unavailable();
}

export async function GET(request: Request, context: RouteContext) {
  const handlers = configuredHandlers();
  return handlers ? handlers.GET(request, context) : unavailable();
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

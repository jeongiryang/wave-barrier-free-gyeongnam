import { createNeonAuth } from "@neondatabase/auth/next/server";

type RouteContext = { params: Promise<{ path: string[] }> };

function configuredHandlers() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!baseUrl || !secret || secret.length < 32) return null;
  return createNeonAuth({ baseUrl, cookies: { secret } }).handler();
}

async function unavailable() {
  return Response.json({ error: "로그인 기능을 준비 중입니다." }, { status: 503 });
}

export async function GET(request: Request, context: RouteContext) {
  const handlers = configuredHandlers();
  return handlers ? handlers.GET(request, context) : unavailable();
}

export async function POST(request: Request, context: RouteContext) {
  const handlers = configuredHandlers();
  return handlers ? handlers.POST(request, context) : unavailable();
}

export async function PUT(request: Request, context: RouteContext) {
  const handlers = configuredHandlers();
  return handlers ? handlers.PUT(request, context) : unavailable();
}

export async function DELETE(request: Request, context: RouteContext) {
  const handlers = configuredHandlers();
  return handlers ? handlers.DELETE(request, context) : unavailable();
}

export async function PATCH(request: Request, context: RouteContext) {
  const handlers = configuredHandlers();
  return handlers ? handlers.PATCH(request, context) : unavailable();
}

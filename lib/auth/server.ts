import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";
import { approvedNeonAuthBaseUrl } from "../deployment/environment-validation.js";

let cachedAuth: NeonAuth | null | undefined;

function configuredBaseUrl() {
  return approvedNeonAuthBaseUrl(process.env.NEON_AUTH_BASE_URL, {
    allowLocalhost: process.env.NODE_ENV !== "production",
  });
}

export function isAuthConfigured() {
  const baseUrl = configuredBaseUrl();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  return Boolean(baseUrl && secret && secret.length >= 32);
}

/** 빌드 시 환경 변수가 없을 때도 안전하며, 런타임에서는 한 인스턴스를 재사용한다. */
export function getAuth(): NeonAuth | null {
  if (cachedAuth !== undefined) return cachedAuth;
  const baseUrl = configuredBaseUrl();
  const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();
  if (!baseUrl || !secret || secret.length < 32) {
    cachedAuth = null;
    return cachedAuth;
  }
  cachedAuth = createNeonAuth({
    baseUrl,
    cookies: { secret, sessionDataTtl: 300, sameSite: "lax" },
    logLevel: process.env.NODE_ENV === "production" ? "silent" : "warn",
  });
  return cachedAuth;
}

export async function getCurrentUser() {
  const auth = getAuth();
  if (!auth) return null;
  try {
    const result = await auth.getSession();
    return result.data?.user ?? null;
  } catch {
    return null;
  }
}

import { headers } from "next/headers";
import { createNativeAuth, AUTH_ORIGIN } from "./native-options.js";
import { createAccountMailer, authMailConfiguration } from "./mail.js";
import { createKakaoUnlink } from "./kakao-lifecycle.js";
import { nativeDatabase, requireNativeSchema } from "./native-database.js";
import { securePostgresUrl } from "../deployment/environment-validation.js";

export function nativeAuthConfigured() {
  try {
    authMailConfiguration();
    return Boolean(securePostgresUrl(process.env.DATABASE_URL)
      && (process.env.NEON_AUTH_COOKIE_SECRET?.trim().length || 0) >= 32
      && /^[a-f0-9]{32}$/i.test(process.env.KAKAO_LOGIN_CLIENT_ID || "")
      && /^[a-z0-9_-]{16,128}$/i.test(process.env.KAKAO_LOGIN_CLIENT_SECRET || "")
      && /^[a-f0-9]{32}$/i.test(process.env.KAKAO_PRIMARY_ADMIN_KEY || ""));
  } catch { return false; }
}

let instance: ReturnType<typeof createNativeAuth> | undefined;
let database: ReturnType<typeof nativeDatabase> | undefined;
let readiness: Promise<void> | undefined;

export function getNativeAuth() {
  if (!nativeAuthConfigured()) return null;
  if (!instance) {
    database = nativeDatabase(process.env.DATABASE_URL);
    instance = createNativeAuth({
      database,
      secret: process.env.NEON_AUTH_COOKIE_SECRET!.trim(),
      clientId: process.env.KAKAO_LOGIN_CLIENT_ID!,
      clientSecret: process.env.KAKAO_LOGIN_CLIENT_SECRET!,
      sendMail: createAccountMailer(),
      unlink: createKakaoUnlink(process.env.KAKAO_PRIMARY_ADMIN_KEY),
      origin: AUTH_ORIGIN,
    });
  }
  return instance;
}

export async function readyNativeAuth() {
  const auth = getNativeAuth();
  if (!auth || !database) throw new Error("AUTH_NOT_CONFIGURED");
  readiness ??= requireNativeSchema(database).catch(() => { readiness = undefined; throw new Error("AUTH_SCHEMA_UNAVAILABLE"); });
  await readiness;
  return auth;
}

export function nativeFacade() {
  if (!nativeAuthConfigured()) return null;
  const handle = async (request: Request) => (await readyNativeAuth()).handler(request);
  return {
    handler: () => ({ GET: handle, POST: handle, PUT: handle, PATCH: handle, DELETE: handle }),
    getSession: async () => ({ data: await (await readyNativeAuth()).api.getSession({ headers: await headers() }), error: null }),
    deleteUser: async (body: { password?: string; callbackURL: string }) => {
      try {
        const data = await (await readyNativeAuth()).api.deleteUser({ body, headers: await headers() });
        return { data, error: null };
      } catch (error) {
        const failure = error as { statusCode?: number; body?: { code?: string } };
        return { data: null, error: { status: failure.statusCode || 502, code: failure.body?.code || "ACCOUNT_REQUEST_FAILED" } };
      }
    },
  };
}

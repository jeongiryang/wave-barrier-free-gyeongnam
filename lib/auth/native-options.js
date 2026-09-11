import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx, getOAuthState } from "better-auth/api";

export const AUTH_ORIGIN = "https://wave-barrier-free-gyeongnam.vercel.app";

/** Shared by the real Postgres runtime and isolated database integration tests. */
export function createNativeAuth({ database, secret, clientId, clientSecret, sendMail, unlink, origin = AUTH_ORIGIN }) {
  let auth;
  async function guardLinkSession(ctx) {
    if (!ctx) return;
    const state = await getOAuthState();
    if (!state?.link) return;
    const session = await getSessionFromCtx(ctx);
    if (!session || session.user.id !== state.link.userId || session.session.id !== state.waveLinkSessionId
      || Date.now() - new Date(session.session.createdAt).getTime() >= 600_000) {
      throw new APIError("UNAUTHORIZED", { code: "SESSION_EXPIRED", message: "다시 로그인한 뒤 카카오 계정을 연결해 주세요." });
    }
  }
  /** @type {import('better-auth').BetterAuthOptions} */
  const options = {
    appName: "WAVE",
    baseURL: origin,
    basePath: "/api/auth",
    secret,
    database,
    trustedOrigins: [origin],
    logger: { disabled: true },
    advanced: {
      cookiePrefix: "wave-auth",
      useSecureCookies: origin.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["x-vercel-forwarded-for"] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 10,
      cookieCache: { enabled: false },
    },
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Existing Neon credential accounts can continue to sign in without a new barrier.
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      sendResetPassword: async ({ user, url }) => sendMail({ kind: "reset", to: user.email, url, origin }),
    },
    emailVerification: {
      sendOnSignUp: false,
      sendOnSignIn: false,
      expiresIn: 60 * 30,
      sendVerificationEmail: async ({ user, url }) => sendMail({ kind: "verify", to: user.email, url, origin }),
    },
    socialProviders: {
      kakao: {
        clientId,
        clientSecret,
        disableDefaultScope: true,
        scope: ["account_email"],
        mapProfileToUser(profile) {
          const account = profile.kakao_account;
          if (!account?.email || !account.is_email_valid || !account.is_email_verified) {
            throw new APIError("UNAUTHORIZED", { code: "KAKAO_EMAIL_REQUIRED", message: "확인된 카카오 이메일이 필요합니다." });
          }
          return { name: "여행자", image: null, email: account.email, emailVerified: true };
        },
      },
    },
    user: {
      additionalFields: {
        banned: { type: "boolean", required: false, input: false, returned: false },
        banExpires: { type: "date", required: false, input: false, returned: false },
      },
      deleteUser: {
        enabled: true,
        deleteTokenExpiresIn: 60 * 30,
        sendDeleteAccountVerification: async ({ user, url }) => sendMail({ kind: "delete", to: user.email, url, origin }),
        beforeDelete: async (user) => {
          // Complete the external unlink before any account/session rows are removed.
          const context = await auth.$context;
          for (const account of await context.internalAdapter.findAccounts(user.id)) {
            if (account.providerId === "kakao") await unlink(account.accountId);
          }
        },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/request-password-reset": { window: 60 * 15, max: 3 },
        "/send-verification-email": { window: 60 * 15, max: 3 },
        "/delete-user": { window: 60 * 15, max: 3 },
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60 * 15, max: 3 },
        "/sign-in/social": { window: 60, max: 5 },
        "/link-social": { window: 60, max: 3 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (["/sign-in/social", "/link-social"].includes(ctx.path)) {
          const lazyMessageScope = ctx.path === "/link-social" && Array.isArray(ctx.body?.scopes) && ctx.body.scopes.length === 1 && ctx.body.scopes[0] === "talk_message";
          if (ctx.body?.provider !== "kakao" || ctx.body?.idToken || (ctx.body?.scopes && !lazyMessageScope) || ctx.body?.additionalData) {
            throw new APIError("BAD_REQUEST", { message: "지원하지 않는 로그인 요청입니다." });
          }
        }
        if (ctx.path === "/link-social") {
          const session = await getSessionFromCtx(ctx);
          if (!session || Date.now() - new Date(session.session.createdAt).getTime() >= 600_000) {
            throw new APIError("UNAUTHORIZED", { code: "SESSION_EXPIRED", message: "다시 로그인한 뒤 카카오 계정을 연결해 주세요." });
          }
          ctx.body.additionalData = { waveLinkSessionId: session.session.id };
        }
        if (ctx.path === "/unlink-account" && ctx.body?.providerId !== "kakao") {
          throw new APIError("BAD_REQUEST", { message: "이 로그인 방법은 여기서 해제할 수 없습니다." });
        }
        if (ctx.path === "/unlink-account") {
          const session = await getSessionFromCtx(ctx);
          const accounts = session ? await ctx.context.internalAdapter.findAccounts(session.user.id) : [];
          if (!accounts.some((account) => account.providerId === "credential" && account.password)) {
            throw new APIError("BAD_REQUEST", { message: "이메일 비밀번호를 먼저 설정해 주세요." });
          }
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session, ctx) => {
            const user = await ctx?.context.internalAdapter.findUserById(session.userId);
            if (user?.banned && (!user.banExpires || new Date(user.banExpires).getTime() > Date.now())) return false;
            // Rate limiting uses the request header; long-lived session rows need no IP/UA.
            return { data: { ...session, ipAddress: null, userAgent: null } };
          },
        },
      },
      account: {
        create: { before: async (_account, ctx) => { await guardLinkSession(ctx); } },
        update: { before: async (_account, ctx) => { await guardLinkSession(ctx); } },
        delete: { before: async (account, ctx) => { if (ctx?.path === "/unlink-account" && account.providerId === "kakao") await unlink(account.accountId); } },
      },
    },
  };
  auth = betterAuth(options);
  return auth;
}

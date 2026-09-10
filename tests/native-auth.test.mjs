import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { getMigrations } from "better-auth/db/migration";
import { createNativeAuth, AUTH_ORIGIN } from "../lib/auth/native-options.js";
import { accountEmail } from "../lib/auth/mail.js";
import { createKakaoUnlink, validKakaoWebhook } from "../lib/auth/kakao-lifecycle.js";
import { kakaoUnlinkWebhook } from "../lib/auth/kakao-webhook.js";

const email = "fixture@example.com";
const password = "Existing-wave-password-123!";
function cookie(response) { return response.headers.getSetCookie().map((part) => part.split(";")[0]).join("; "); }

async function fixture(t) {
  const db = new DatabaseSync(":memory:");
  const mails = [];
  const unlinks = [];
  const auth = createNativeAuth({ database: db, secret: "fixture-only-auth-secret-12345678901234567890", clientId: "fixture-client", clientSecret: "fixture-client-secret", sendMail: async (mail) => { accountEmail(mail); mails.push(mail); }, unlink: async (id) => { unlinks.push(id); } });
  await (await getMigrations(auth.options)).runMigrations();
  db.exec('CREATE UNIQUE INDEX provider_account_unique ON account ("providerId", "accountId")');
  t.after(() => db.close());
  const id = randomUUID();
  const salt = "1234567890abcdef1234567890abcdef";
  const hash = `${salt}:${scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 64 * 1024 * 1024 }).toString("hex")}`;
  const now = Date.now();
  db.prepare('INSERT INTO user (id,name,email,"emailVerified","createdAt","updatedAt") VALUES (?,?,?,1,?,?)').run(id, "기존 여행자", email, now, now);
  db.prepare('INSERT INTO account (id,"userId","accountId","providerId",password,"createdAt","updatedAt") VALUES (?,?,?,\'credential\',?,?,?)').run(randomUUID(), id, id, hash, now, now);
  async function request(path, body, cookies = "", extra = {}) {
    return auth.handler(new Request(`${AUTH_ORIGIN}/api/auth${path}`, {
      method: body ? "POST" : "GET",
      headers: { Origin: AUTH_ORIGIN, "Content-Type": "application/json", "x-vercel-forwarded-for": "192.0.2.1", Cookie: cookies, ...extra },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
  }
  return { db, auth, request, id, hash, mails, unlinks };
}

test("existing UUID/scrypt credential signs in unchanged; session/signout use one database", async (t) => {
  const f = await fixture(t);
  const login = await f.request("/sign-in/email", { email, password });
  assert.equal(login.status, 200, await login.clone().text());
  const signedIn = await login.json();
  assert.equal(signedIn.user.id, f.id);
  assert.equal(f.db.prepare("SELECT password FROM account").get().password, f.hash);
  assert.match(cookie(login), /__Secure-wave-auth.session_token=/);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  const session = await f.request("/get-session", null, cookie(login));
  assert.equal((await session.json()).user.id, f.id);
  assert.deepEqual({ ...f.db.prepare('SELECT "ipAddress", "userAgent" FROM session').get() }, { ipAddress: null, userAgent: null });
  assert.equal((await f.request("/sign-out", {}, cookie(login))).status, 200);
  assert.equal(await (await f.request("/get-session", null, cookie(login))).json(), null);
});

test("password recovery mails a one-use token, preserves user identity, and revokes old sessions", async (t) => {
  const f = await fixture(t);
  const login = await f.request("/sign-in/email", { email, password });
  const sent = await f.request("/request-password-reset", { email, redirectTo: `${AUTH_ORIGIN}/reset-password` });
  assert.equal(sent.status, 200, await sent.clone().text());
  assert.equal(f.mails.length, 1);
  const url = new URL(f.mails[0].url);
  const token = url.pathname.split("/").pop();
  const changed = await f.request("/reset-password", { token, newPassword: "Recovered-password-456!" });
  assert.equal(changed.status, 200, await changed.clone().text());
  assert.equal(await (await f.request("/get-session", null, cookie(login))).json(), null);
  assert.equal((await f.request("/reset-password", { token, newPassword: "Repeated-password-789!" })).status, 400);
  const again = await f.request("/sign-in/email", { email, password: "Recovered-password-456!" });
  assert.equal((await again.json()).user.id, f.id);
  const absent = await f.request("/request-password-reset", { email: "absent@example.com", redirectTo: `${AUTH_ORIGIN}/reset-password` });
  assert.equal(absent.status, sent.status);
  assert.equal(f.mails.length, 1);
});

test("OAuth uses only email; forged state, expanded scopes and external callbacks are rejected", async (t) => {
  const f = await fixture(t);
  const start = await f.request("/sign-in/social", { provider: "kakao", callbackURL: "/community", errorCallbackURL: "/login" });
  assert.equal(start.status, 200, await start.clone().text());
  const location = new URL((await start.json()).url);
  assert.equal(location.origin, "https://kauth.kakao.com");
  assert.equal(location.searchParams.get("scope"), "account_email");
  assert.equal(location.searchParams.get("redirect_uri"), `${AUTH_ORIGIN}/api/auth/callback/kakao`);
  assert.ok(location.searchParams.get("state"));
  const forged = await f.request("/callback/kakao?state=forged&code=fake", null, cookie(start));
  assert.equal(forged.status, 302);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM session").get().n, 0);
  assert.equal((await f.request("/sign-in/social", { provider: "kakao", callbackURL: "https://evil.example" })).status, 403);
  assert.equal((await f.request("/sign-in/social", { provider: "kakao", scopes: ["friends"] })).status, 400);
  assert.equal((await f.request("/link-social", { provider: "kakao" })).status, 401);
});

test("account deletion requires a mailed token and matching session, including OAuth-only accounts", async (t) => {
  const f = await fixture(t);
  const login = await f.request("/sign-in/email", { email, password });
  f.db.prepare("DELETE FROM account").run();
  f.db.prepare('INSERT INTO account (id,"userId","accountId","providerId","createdAt","updatedAt") VALUES (?,?,\'123456789\',\'kakao\',?,?)').run(randomUUID(), f.id, Date.now(), Date.now());
  const sent = await f.request("/delete-user", { callbackURL: `${AUTH_ORIGIN}/account/delete-complete?token=${"a".repeat(64)}` }, cookie(login));
  assert.equal(sent.status, 200, await sent.clone().text());
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM user").get().n, 1);
  assert.equal(f.mails[0].kind, "delete");
  const deletionUrl = new URL(f.mails[0].url);
  const path = deletionUrl.pathname.replace("/api/auth", "") + deletionUrl.search;
  assert.equal((await f.request(path)).status, 404);
  assert.equal((await f.request(path, null, cookie(login))).status, 302);
  assert.deepEqual(f.unlinks, ["123456789"]);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM user").get().n, 0);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account").get().n, 0);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM session").get().n, 0);
});

test("Kakao webhook is authenticated and unlink refusal never becomes success", async () => {
  const key = "a".repeat(32);
  const params = new URLSearchParams({ app_id: "1539906", user_id: "123456789" });
  assert.equal(validKakaoWebhook(`KakaoAK ${key}`, params, key), true);
  assert.equal(validKakaoWebhook("KakaoAK wrong", params, key), false);
  params.append("user_id", "987654321");
  assert.equal(validKakaoWebhook(`KakaoAK ${key}`, params, key), false);
  const unlink = createKakaoUnlink(key, async (url, init) => {
    assert.equal(url, "https://kapi.kakao.com/v1/user/unlink");
    assert.equal(init.body.get("target_id"), "123456789");
    return Response.json({ id: 123456789 });
  });
  await unlink("123456789");
  await assert.rejects(createKakaoUnlink(key, async () => { throw new Error("provider sensitive details"); })("123456789"), { message: "KAKAO_UNLINK_FAILED" });
});

test("external unlink rejects forged/oversized requests and acknowledges only durable completion", async () => {
  const env = { WAVE_AUTH_BACKEND: "native", KAKAO_PRIMARY_ADMIN_KEY: "a".repeat(32) };
  let calls = 0;
  const disconnect = async (id) => { calls++; assert.equal(id, "123456789"); };
  const url = `${AUTH_ORIGIN}/api/kakao/unlink?app_id=1539906&user_id=123456789`;
  assert.equal((await kakaoUnlinkWebhook(new Request(url), env, disconnect)).status, 401);
  assert.equal(calls, 0);
  const headers = { Authorization: `KakaoAK ${env.KAKAO_PRIMARY_ADMIN_KEY}`, "Content-Type": "application/x-www-form-urlencoded" };
  assert.equal((await kakaoUnlinkWebhook(new Request(url, { headers }), env, disconnect)).status, 200);
  assert.equal((await kakaoUnlinkWebhook(new Request(url, { headers }), env, disconnect)).status, 200);
  assert.equal(calls, 2);
  assert.equal((await kakaoUnlinkWebhook(new Request(url, { headers, method: "POST", body: "x".repeat(2049) }), env, disconnect)).status, 413);
  assert.equal((await kakaoUnlinkWebhook(new Request(url, { headers }), env, async () => { throw new Error("db unavailable"); })).status, 503);
});

test("verified Kakao email never implicitly merges; explicit linking preserves the existing account", async (t) => {
  const f = await fixture(t);
  let networkCalls = 0;
  t.mock.method(globalThis, "fetch", async (input) => {
    networkCalls++;
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://kauth.kakao.com/oauth/token") return Response.json({ access_token: "fixture-access-token", refresh_token: "fixture-refresh-token", token_type: "bearer", expires_in: 3600 });
    if (url === "https://kapi.kakao.com/v2/user/me") return Response.json({ id: 123456789, kakao_account: { email, is_email_valid: true, is_email_verified: true } });
    throw new Error("Unexpected fixture network request");
  });
  async function roundTrip(path, sessionCookie = "") {
    const start = await f.request(path, { provider: "kakao", callbackURL: "/account", errorCallbackURL: "/login?error=kakao" }, sessionCookie);
    assert.equal(start.status, 200, await start.clone().text());
    const state = new URL((await start.json()).url).searchParams.get("state");
    const callback = `/callback/kakao?code=fixture-code&state=${encodeURIComponent(state)}`;
    const completed = await f.request(callback, null, `${sessionCookie}; ${cookie(start)}`);
    return { completed, callback, cookies: `${sessionCookie}; ${cookie(start)}` };
  }
  const implicit = await roundTrip("/sign-in/social");
  assert.equal(implicit.completed.status, 302);
  assert.match(implicit.completed.headers.get("location"), /error=/);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM user").get().n, 1);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account").get().n, 1);
  const login = await f.request("/sign-in/email", { email, password });
  const explicit = await roundTrip("/link-social", cookie(login));
  assert.equal(explicit.completed.status, 302);
  assert.equal(explicit.completed.headers.get("location"), "/account");
  const account = f.db.prepare("SELECT * FROM account WHERE providerId='kakao'").get();
  assert.equal(account.userId, f.id);
  assert.notEqual(account.accessToken, "fixture-access-token");
  assert.notEqual(account.refreshToken, "fixture-refresh-token");
  assert.equal(f.db.prepare("SELECT name FROM user").get().name, "기존 여행자");
  const callsBeforeReplay = networkCalls;
  await f.request(explicit.callback, null, explicit.cookies);
  assert.equal(networkCalls, callsBeforeReplay);
  const socialLogin = await roundTrip("/sign-in/social");
  const session = await f.request("/get-session", null, cookie(socialLogin.completed));
  assert.equal((await session.json()).user.id, f.id);
  const unlink = await f.request("/unlink-account", { providerId: "kakao" }, cookie(login));
  assert.equal(unlink.status, 200, await unlink.clone().text());
  assert.deepEqual(f.unlinks, ["123456789"]);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account").get().n, 1);
  const pending = await f.request("/link-social", { provider: "kakao", callbackURL: "/account" }, cookie(login));
  assert.equal(pending.status, 200);
  const pendingState = new URL((await pending.json()).url).searchParams.get("state");
  await f.request("/sign-out", {}, cookie(login));
  const revoked = await f.request(`/callback/kakao?code=fixture-code&state=${encodeURIComponent(pendingState)}`, null, `${cookie(login)}; ${cookie(pending)}`);
  assert.equal(revoked.status, 401);
  assert.equal((await revoked.json()).code, "SESSION_EXPIRED");
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM account").get().n, 1);
});

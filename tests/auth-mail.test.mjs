import assert from "node:assert/strict";
import test from "node:test";
import { accountEmail, authMailConfiguration, createAccountMailer, verifyAccountMailer } from "../lib/auth/mail.js";

const origin = "https://wave-barrier-free-gyeongnam.vercel.app";
const env = { SMTP_USER: "wave-fixture@gmail.com", SMTP_PASS: "aaaa bbbb cccc dddd" };
const reset = { kind: "reset", to: "traveler@example.com", url: `${origin}/api/auth/reset-password/test-token-1234567890?callbackURL=${encodeURIComponent(`${origin}/reset-password`)}` };

test("Gmail transport keeps certificate validation, bounded timeouts and credentials out of logs", () => {
  const settings = authMailConfiguration(env);
  assert.equal(settings.auth.pass, "aaaabbbbccccdddd");
  assert.equal(settings.port, 465);
  assert.equal(settings.secure, true);
  assert.equal(settings.tls.rejectUnauthorized, true);
  assert.equal(settings.maxRecipients, 1);
  assert.equal(settings.debug, false);
  assert.equal(settings.logger, false);
  assert.equal(settings.transactionLog, false);
  assert.ok(settings.socketTimeout <= 15000);
  for (const invalid of [{}, { ...env, SMTP_PASS: "" }, { ...env, SMTP_USER: "wave@gmail.com\r\nBcc: other@example.com" }, { ...env, SMTP_USER: "wave@unconfigured.example" }]) {
    assert.throws(() => authMailConfiguration(invalid), /AUTH_MAIL_/);
  }
});

test("account emails contain a Korean, single-recipient, deployment-owned action link", () => {
  const message = accountEmail(reset);
  assert.equal(message.to.address, "traveler@example.com");
  assert.equal(message.subject, "WAVE 비밀번호 재설정");
  assert.match(message.html, /lang="ko"/);
  assert.match(message.text, /비밀번호 재설정/);
  assert.equal(message.disableFileAccess, true);
  assert.equal(message.disableUrlAccess, true);
});

test("mail links reject other origins, credentials, arbitrary paths and redirect destinations", () => {
  for (const url of [
    "https://evil.example/api/auth/reset-password/test-token-1234567890",
    `${origin.replace("https://", "https://user:pass@")}/api/auth/reset-password/test-token-1234567890`,
    `${origin}/planner`,
    `${origin}/api/auth/reset-password/short`,
    `${reset.url}#fragment`,
    `${origin}/api/auth/reset-password/test-token-1234567890?callbackURL=https://evil.example/reset-password`,
    `${origin}/api/auth/reset-password/test-token-1234567890?callbackURL=//evil.example/reset-password`,
  ]) assert.throws(() => accountEmail({ ...reset, url }), /AUTH_MAIL_INVALID_LINK/);
  assert.throws(() => accountEmail({ ...reset, origin: "https://evil.example", url: "https://evil.example/api/auth/reset-password/test-token-1234567890" }), /AUTH_MAIL_INVALID_ORIGIN/);
  for (const to of ["one@example.com,two@example.com", "one@example.com\r\nBcc:two@example.com", "Name <one@example.com>"]) assert.throws(() => accountEmail({ ...reset, to }), /AUTH_MAIL_INVALID_ADDRESS/);
});

test("SMTP refusal is reported as failure once without leaking the provider response", async () => {
  let calls = 0;
  const send = createAccountMailer(env, () => ({ async sendMail() { calls++; throw new Error("535 private-address@gmail.com private-auth-data"); } }));
  await assert.rejects(send(reset), { message: "AUTH_MAIL_DELIVERY_FAILED" });
  assert.equal(calls, 1);
  const refused = createAccountMailer(env, () => ({ async sendMail() { return { accepted: [], rejected: ["traveler@example.com"] }; } }));
  await assert.rejects(refused(reset), { message: "AUTH_MAIL_DELIVERY_FAILED" });
});

test("malformed recipients fail before transport and caller cannot replace the sender", async () => {
  let calls = 0;
  const send = createAccountMailer(env, () => ({ async sendMail(message) {
    calls++;
    assert.deepEqual(message.from, { name: "WAVE", address: env.SMTP_USER });
    assert.equal(message.attachments, undefined);
    return { accepted: ["traveler@example.com"], rejected: [] };
  } }));
  await assert.rejects(send({ ...reset, to: "one@example.com,two@example.com" }), /AUTH_MAIL_INVALID_ADDRESS/);
  assert.equal(calls, 0);
  await send({ ...reset, from: "spoof@example.com", attachments: [{ path: "private-file" }] });
  assert.equal(calls, 1);
});

test("deployment verifies SMTP without sending messages and always closes the connection", async () => {
  let closed = 0;
  await verifyAccountMailer(env, () => ({ verify: async () => true, close: () => { closed++; } }));
  await assert.rejects(verifyAccountMailer(env, () => ({ verify: async () => { throw new Error("provider details"); }, close: () => { closed++; } })), { message: "AUTH_MAIL_NOT_READY" });
  assert.equal(closed, 2);
});

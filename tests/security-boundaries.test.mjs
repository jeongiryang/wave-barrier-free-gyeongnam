import assert from "node:assert/strict";
import test from "node:test";
import { verifySameOriginMutation } from "../lib/server-request.ts";
import { approvedNeonAuthBaseUrl, securePostgresUrl } from "../lib/deployment/environment-validation.js";
import { sameOriginHttpUrl } from "../lib/security/same-origin-url.js";

test("state-changing browser requests reject cross-origin and cross-site sources", async () => {
  const byOrigin = await verifySameOriginMutation(new Request("https://wave.example/api/community/posts/1/like", {
    method: "DELETE",
    headers: { Origin: "https://attacker.example" },
  }));
  assert.equal(byOrigin?.status, 403);
  assert.equal(byOrigin?.headers.get("cache-control"), "no-store");

  const byFetchMetadata = await verifySameOriginMutation(new Request("https://wave.example/api/community/posts", {
    method: "POST",
    headers: { Origin: "https://wave.example", "Sec-Fetch-Site": "cross-site" },
  }));
  assert.equal(byFetchMetadata?.status, 403);

  const accepted = await verifySameOriginMutation(new Request("https://wave.example/api/community/posts", {
    method: "POST",
    headers: { Origin: "https://wave.example", "Sec-Fetch-Site": "same-origin" },
  }));
  assert.equal(accepted, null);

  const readOnly = await verifySameOriginMutation(new Request("https://wave.example/api/community/posts", {
    headers: { Origin: "https://attacker.example" },
  }));
  assert.equal(readOnly, null);
});

test("auth mutation bodies are bounded even without Content-Length", async () => {
  const oversized = await verifySameOriginMutation(new Request("https://wave.example/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: "https://wave.example" },
    body: "x".repeat(65),
  }), 64);
  assert.equal(oversized?.status, 413);

  const accepted = await verifySameOriginMutation(new Request("https://wave.example/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: "https://wave.example" },
    body: "x".repeat(64),
  }), 64);
  assert.equal(accepted, null);
});

test("shared URLs remain on the current HTTP origin", () => {
  assert.equal(
    sameOriginHttpUrl("/trip/abc#details", "https://wave.example"),
    "https://wave.example/trip/abc",
  );
  assert.equal(sameOriginHttpUrl("https://wave.example.evil.test/trip/abc", "https://wave.example"), null);
  assert.equal(sameOriginHttpUrl("javascript:alert(1)", "https://wave.example"), null);
});

test("production service URLs require approved hosts, protocols and TLS", () => {
  assert.equal(
    approvedNeonAuthBaseUrl("https://ep-wave.neonauth.us-east-2.aws.neon.tech/neondb/auth"),
    "https://ep-wave.neonauth.us-east-2.aws.neon.tech/neondb/auth",
  );
  assert.equal(approvedNeonAuthBaseUrl("http://ep-wave.neon.tech/auth"), null);
  assert.equal(approvedNeonAuthBaseUrl("https://ep-wave.neon.tech.evil.test/auth"), null);
  assert.match(
    securePostgresUrl("postgresql://wave:secret@ep-wave.us-east-2.aws.neon.tech/wave?sslmode=require") || "",
    /^postgresql:/,
  );
  assert.equal(securePostgresUrl("postgresql://wave:secret@db.example/wave?sslmode=disable"), null);
  assert.equal(securePostgresUrl("postgresql://wave@db.example/wave?sslmode=require"), null);
  assert.equal(securePostgresUrl("mysql://wave:secret@db.example/wave?sslmode=require"), null);
});

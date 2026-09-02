import assert from "node:assert/strict";
import test from "node:test";
import { verifySameOriginMutation } from "../lib/security/request-boundaries.js";
import { friendlyAuthError } from "../lib/auth/error-message.js";
import { privateAuthResponse } from "../lib/auth/private-response.js";
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

  const bySameSite = await verifySameOriginMutation(new Request("https://wave.example/api/community/posts", {
    method: "POST",
    headers: { "Sec-Fetch-Site": "same-site" },
  }));
  assert.equal(bySameSite?.status, 403);

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

  const malformedLength = await verifySameOriginMutation(new Request("https://wave.example/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: "https://wave.example", "Content-Length": "not-a-number" },
    body: "x",
  }), 64);
  assert.equal(malformedLength?.status, 413);
});

test("auth failures do not reveal account existence or provider internals", () => {
  const invalid = friendlyAuthError("invalid credential");
  assert.equal(friendlyAuthError("user already exists"), invalid);
  assert.equal(friendlyAuthError("duplicate account"), invalid);
  assert.equal(friendlyAuthError("database stack trace"), invalid);
  assert.notEqual(friendlyAuthError("network unavailable"), invalid);
});

test("auth session responses can never remain publicly cacheable", async () => {
  const upstream = Response.json({ session: { user: { id: "private-user" } } }, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "CDN-Cache-Control": "public, s-maxage=3600",
      "Vercel-CDN-Cache-Control": "public, s-maxage=3600",
      "Surrogate-Control": "max-age=3600",
    },
  });
  const secured = privateAuthResponse(upstream);
  assert.equal(secured.headers.get("cache-control"), "private, no-store");
  assert.equal(secured.headers.get("cdn-cache-control"), null);
  assert.equal(secured.headers.get("vercel-cdn-cache-control"), null);
  assert.equal(secured.headers.get("surrogate-control"), null);
  assert.equal(secured.headers.get("pragma"), "no-cache");
  assert.equal(secured.headers.get("expires"), "0");
  assert.equal(secured.headers.get("x-content-type-options"), "nosniff");
  assert.match(secured.headers.get("vary") || "", /Cookie/i);
  assert.deepEqual(await secured.json(), { session: { user: { id: "private-user" } } });
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
  assert.equal(approvedNeonAuthBaseUrl("https://neon.tech/auth"), null);
  assert.match(
    securePostgresUrl("postgresql://wave:secret@ep-wave.us-east-2.aws.neon.tech/wave?sslmode=require") || "",
    /^postgresql:/,
  );
  assert.equal(securePostgresUrl("postgresql://wave:secret@db.example/wave?sslmode=disable"), null);
  assert.equal(securePostgresUrl("postgresql://wave:secret@db.example/wave?sslmode=require&sslmode=disable"), null);
  assert.equal(securePostgresUrl("postgresql://wave:secret@db.example/wave?sslmode=require&ssl=false"), null);
  assert.equal(securePostgresUrl("postgresql://wave:secret@127.0.0.1/wave?sslmode=require"), null);
  assert.match(
    securePostgresUrl("postgresql://wave:secret@[::1]/wave", { allowLocalhost: true }) || "",
    /^postgresql:/,
  );
  assert.equal(securePostgresUrl("postgresql://wave@db.example/wave?sslmode=require"), null);
  assert.equal(securePostgresUrl("mysql://wave:secret@db.example/wave?sslmode=require"), null);
});

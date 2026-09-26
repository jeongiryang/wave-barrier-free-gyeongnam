import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const titles = {
  "/": "WAVE 경남 무장애 여행 길잡이",
  "/planner": "경남 무장애 여행 계획 | WAVE",
  "/travel-book": "내 일정 | WAVE",
  "/photo-course": "사진으로 되찾는 여행 코스 | WAVE",
  "/community": "여행자 후기 | WAVE",
  "/login": "로그인 | WAVE",
  "/register": "회원가입 | WAVE",
  "/forgot-password": "비밀번호 재설정 | WAVE",
  "/reset-password": "새 비밀번호 설정 | WAVE",
  "/account": "계정 관리 | WAVE",
  "/account/delete-complete": "계정 삭제 완료 | WAVE",
  "/policies": "서비스 운영정책 | WAVE",
  "/privacy": "개인정보처리방침 | WAVE",
  "/terms": "서비스 이용약관 | WAVE",
};
const document = title => `<!DOCTYPE html><html lang="ko"><head><title>${title}</title><meta content="WAVE" name="application-name"><link href='/manifest.webmanifest' rel='manifest'></head><body><nav>여행 계획</nav><main><h1>여행을 준비하세요</h1></main></body></html>`;
const provider = id => ({ id, configured: true, state: "connected", queryStatus: "success", resultCount: 1 });
// Synthetic contracts only. No real provider, model, database or browser is called.
const apiFixtures = {
  "/api/health": { ok: true, scope: "configuration", keys: [] },
  "/api/weather": { source: "Open-Meteo", days: [{}, {}, {}] },
  "/api/location-search": { places: [{}] },
  "/api/map-config": { provider: "kakao", javascriptKey: "synthetic-key" },
  "/api/route": { configured: true, alternatives: [{ provider: "Kakao Mobility", configured: true }], providers: ["korail", "tago-bus-stop", "tago-bus-arrival", "tago-rail-catalog", "tago-express-catalog", "tago-intercity-catalog"].map(provider) },
  plan: { statuses: [{ id: "barrierfree", state: "live" }, { id: "tour", state: "live", count: 1 }], places: [{}] },
  enrich: { statuses: [{ state: "live" }] },
  photo: { photo: {}, status: { state: "live" } },
  "spot-photo": { status: "live", image: "https://fixture.invalid/photo.jpg" },
  crowd: { status: { state: "live" } },
  "parking-alternatives": { status: "empty", contentId: "2783785", source: "전국주차장정보표준데이터", checkedAt: "2026-09-27T00:00:00Z", items: [] },
  "/api/community/posts": { posts: [] },
  "/api/auth/get-session": null,
};

function runSmoke({ args = ["--pages-only"], html = {}, types = {}, api = {}, throws = [], status = {}, delays = {} } = {}) {
  const folder = mkdtempSync(join(tmpdir(), "wave-document-smoke-"));
  const entry = new URL("../scripts/check-production-apis.mjs", import.meta.url).href;
  const documents = Object.fromEntries(Object.entries(titles).map(([path, title]) => [path, document(title)]));
  const fixtures = { ...apiFixtures, ...api };
  const script = `
    process.argv = [process.execPath, 'check-production-apis.mjs', ...${JSON.stringify(args)}];
    const documents = ${JSON.stringify({ ...documents, ...html })};
    const fixtures = ${JSON.stringify(fixtures)};
    const types = ${JSON.stringify(types)}, statuses = ${JSON.stringify(status)}, delays = ${JSON.stringify(delays)};
    const calls = [];
    globalThis.fetch = async input => {
      const url = new URL(input), path = url.pathname;
      calls.push(path);
      if (${JSON.stringify(throws)}.includes(path)) throw Error('PRIVATE_SENTINEL https://private.invalid/?key=PRIVATE_SENTINEL');
      if (delays[path]) await new Promise(resolve => setTimeout(resolve, delays[path]));
      if (path.startsWith('/api/')) {
        const key = path === '/api/wave' ? url.searchParams.get('action') : path;
        if (!(key in fixtures)) throw Error('UNMOCKED_REQUEST');
        return Response.json(fixtures[key], {status:statuses[path] || 200});
      }
      if (!(path in documents)) throw Error('UNMOCKED_REQUEST');
      return new Response(documents[path], {status:statuses[path] || 200, headers:{'Content-Type': types[path] || 'text/html; charset=utf-8'}});
    };
    await import(${JSON.stringify(entry)});
    console.log('CALLS=' + JSON.stringify(calls));
  `;
  try {
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: folder, encoding: "utf8", windowsHide: true, timeout: 15000, env: { GITHUB_OUTPUT: join(folder, "outputs.txt") } });
    assert.equal(child.error, undefined);
    const evidence = JSON.parse(readFileSync(join(folder, "provider-smoke-result.json"), "utf8"));
    const calls = JSON.parse(child.stdout.match(/CALLS=(\[[^\n]*\])/)[1]);
    assert.doesNotMatch(child.stdout + child.stderr + JSON.stringify(evidence), /PRIVATE_SENTINEL|synthetic-key|fixture\.invalid/);
    return { ...child, evidence, calls };
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

test("pages-only validates all 14 current WAVE documents with no API calls and explicit limited scope", () => {
  const run = runSmoke();
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.evidence.ok, true);
  assert.equal(run.evidence.scope, "pages-only");
  assert.equal(run.evidence.applicationRequests, 14);
  assert.deepEqual(run.calls, Object.keys(titles));
  assert.deepEqual(run.evidence.checks.map(check => check.name), Object.keys(titles).map(path => `page:${path}`));
});

test("default smoke still validates 14 APIs before the same 14 pages", () => {
  const run = runSmoke({ args: [] });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.evidence.scope, "apis-and-pages");
  assert.equal(run.evidence.applicationRequests, 28);
  assert.equal(run.evidence.checks.length, 28);
  assert.ok(run.calls.slice(0, 14).every(path => path.startsWith("/api/")));
  assert.deepEqual(run.calls.slice(14), Object.keys(titles));
});

test("production SSR resolves the official manifest URL and serializes an unused error fallback inside RSC script", () => {
  // Reduced from the public 2026-09-27 root HTML. This is a replay fixture, not a live request.
  const html = document(titles["/"])
    .replace("href='/manifest.webmanifest'", 'href="https://wave-barrier-free-gyeongnam.vercel.app/manifest.webmanifest"')
    .replace("</body>", '<script>self.__rsc.push("[\\\"$\\\",\\\"main\\\",null,{\\\"className\\\":\\\"route-state-page wave-night night-secondary\\\"}]")</script></body>');
  const run = runSmoke({ html: { "/": html } });
  assert.equal(run.status, 0);
  assert.equal(run.evidence.applicationRequests, 14);
  assert.equal(run.evidence.checks.length, 14);
});

for (const [name, html] of [
  ["plain branded error", "<!doctype html><html><head><title>WAVE error</title></head><body><main>W.A.V.E WAVE unavailable</main></body></html>"],
  ["wrong route / login fallback", document(titles["/login"])],
  ["brand-correct application error", document(titles["/"]).replace("<main>", '<main class="route-state-page" aria-labelledby="route-error-title"><p>CONNECTION PAUSE</p>')],
  ["brand-correct 404", document(titles["/"]).replace("<main>", '<main class="route-state-page wave-night night-secondary"><div>404</div>')],
  ["missing app identity", document(titles["/"]).replace('name="application-name"', 'name="unrelated"')],
  ["unrelated manifest origin", document(titles["/"]).replace("href='/manifest.webmanifest'", "href='https://unrelated.invalid/manifest.webmanifest'")],
  ["missing document head", document(titles["/"]).replace(/<head>[\s\S]*?<\/head>/, "")],
  ["quoted document only", `<!--${document(titles["/"])}-->`],
  ["script-quoted document only", `<script>const html = '${document(titles["/"])}';</script>`],
]) test(`document identity rejects ${name} without logging the body`, () => {
  const run = runSmoke({ html: { "/": html + "PRIVATE_SENTINEL" } });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.result, "failed");
  assert.deepEqual(run.evidence.failedChecks, ["page:/"]);
  assert.equal(run.evidence.checks.length, 13);
  assert.equal(run.evidence.applicationRequests, 14);
});

test("a JSON response containing genuine-looking HTML is not an HTML page", () => {
  const run = runSmoke({ types: { "/": "application/json" } });
  assert.equal(run.status, 1);
  assert.deepEqual(run.evidence.failedChecks, ["page:/"]);
});

test("page failure preserves all 14 preceding API successes and waits for remaining page checks", () => {
  const run = runSmoke({ args: [], html: { "/": "WAVE PRIVATE_SENTINEL" }, delays: { "/terms": 50 } });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.applicationRequests, 28);
  assert.equal(run.evidence.checks.length, 27);
  assert.equal(run.evidence.checks[13].name, "auth");
  assert.equal(run.evidence.checks.at(-1).name, "page:/terms");
  assert.deepEqual(run.evidence.failedChecks, ["page:/"]);
});

test("API contract failure retains earlier checks and stops before later API/page requests", () => {
  const run = runSmoke({ args: [], api: { "/api/weather": { error: "PRIVATE_SENTINEL" } } });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.applicationRequests, 2);
  assert.deepEqual(run.evidence.checks.map(check => check.name), ["configuration"]);
  assert.deepEqual(run.evidence.failedChecks, ["weather"]);
});

test("page-only network failures never retry or leak raw error text and keep the actual count", () => {
  const run = runSmoke({ throws: ["/", "/planner"] });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.applicationRequests, 14);
  assert.equal(run.calls.filter(path => path === "/").length, 1);
  assert.deepEqual(run.evidence.failedChecks, ["page:/", "page:/planner"]);
});

test("unknown options fail before any live request rather than accidentally running all APIs", () => {
  const run = runSmoke({ args: ["--page-only"] });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.applicationRequests, 0);
  assert.deepEqual(run.evidence.failedChecks, ["arguments"]);
});

test("provider restrictions preserve external hold semantics plus completed checks and request count", () => {
  const failure = { provider: "odsay", operation: "searchPubTransPathT", kind: "quota_exhausted", retryAfterMs: null };
  const run = runSmoke({ args: [], api: { "/api/weather": { failure, message: "PRIVATE_SENTINEL" } }, status: { "/api/weather": 502 } });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.result, "blocked-external");
  assert.equal(run.evidence.engineeringRequired, false);
  assert.equal(run.evidence.applicationRequests, 2);
  assert.deepEqual(run.evidence.checks.map(check => check.name), ["configuration"]);
  assert.deepEqual(run.evidence.failedChecks, ["weather"]);
  assert.equal(run.evidence.failures[0].kind, "quota_exhausted");
});

test("a concurrent page contract failure is retained as engineering work alongside an HTTP429 hold", () => {
  const run = runSmoke({ status: { "/planner": 429 }, html: { "/": "WAVE PRIVATE_SENTINEL" } });
  assert.equal(run.status, 1);
  assert.equal(run.evidence.result, "blocked-mixed");
  assert.equal(run.evidence.engineeringRequired, true);
  assert.equal(run.evidence.applicationRequests, 14);
  assert.deepEqual(run.evidence.failedChecks, ["page:/", "page:/planner"]);
  assert.equal(run.evidence.failures[0].provider, "wave");
});

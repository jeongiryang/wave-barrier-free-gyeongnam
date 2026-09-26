import { readFileSync, writeFileSync } from "node:fs";
import { verifiedPublicTransport } from "./production-transport-contract.mjs";
import { assertProviderAvailable, createSmokeBudget, ProviderBlocked, reportProviderBlock } from "./provider-smoke-policy.mjs";
import { parseProviderRetryAfter } from "../lib/provider-failure.js";

const DEFAULT_BASE_URL = "https://wave-barrier-free-gyeongnam.vercel.app";
const requestedBaseUrl = String(process.env.WAVE_PRODUCTION_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const baseUrl = new URL(requestedBaseUrl);
if (baseUrl.protocol !== "https:" || (baseUrl.hostname !== "wave-barrier-free-gyeongnam.vercel.app" && !baseUrl.hostname.endsWith(".vercel.app"))) {
  throw new Error("WAVE_PRODUCTION_BASE_URL은 승인된 Vercel HTTPS 주소여야 합니다.");
}

const budget = createSmokeBudget();
const pagesOnly = process.argv.slice(2).length === 1 && process.argv[2] === "--pages-only";
const scope = pagesOnly ? "pages-only" : "apis-and-pages";
const resultFile = "provider-smoke-result.json";
const checks = [];
const failedChecks = [];
let activeCheck = "arguments";
let providerBlock;

function reportResult(result) {
  const evidence = { version: 1, checkedAt: new Date().toISOString(), baseUrl: baseUrl.origin, ...result,
    scope, applicationRequests: budget.count(), checks, failedChecks };
  writeFileSync(resultFile, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
}

async function fetchResponse(path, timeoutMs = 65_000, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > maxAttempts) break;
    if (providerBlock) throw providerBlock;
    budget.take();
    try {
      const response = await fetch(new URL(path, `${baseUrl}/`), {
        headers: { Accept: path.startsWith("/api/") ? "application/json" : "text/html" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response;
      // Inspect only structured safe metadata; never log raw provider bodies.
      const body = await response.clone().json().catch(() => null);
      assertProviderAvailable(body);
      if (response.status === 429) throw new ProviderBlocked([{provider:"wave",operation:"public-api",kind:"rate_limited",retryAfterMs:parseProviderRetryAfter(response.headers.get("retry-after"))}]);
      lastError = new Error(`${path} 응답 ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      if (error instanceof ProviderBlocked) { providerBlock = error; throw error; }
      lastError = error;
    }
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError instanceof Error ? lastError : new Error(`${path} 응답을 확인하지 못했습니다.`);
}

async function jsonCheck(name, path, validate, timeoutMs) {
  activeCheck = name;
  const startedAt = Date.now();
  const response = await fetchResponse(path, timeoutMs);
  const body = await response.json();
  assertProviderAvailable(body);
  if (!validate(body)) throw new Error(`${name} 응답 계약을 충족하지 못했습니다.`);
  return { name, ms: Date.now() - startedAt };
}

// These are the titles declared by app/layout.tsx and each route's pageMetadata.
// Exact route identity avoids accepting a generic error/login page containing "WAVE".
const pageTitles = {
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

function pageDocumentMatches(body, path) {
  // Ignore text that merely quotes HTML in comments/scripts/styles.
  const markup = body.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const head = markup.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1];
  const content = markup.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i)?.[1];
  if (!/^\s*<!doctype\s+html\s*>/i.test(markup) || !/<html\b[^>]*>/i.test(markup)
    || !/<\/html\s*>/i.test(markup) || !head || !content || !/<(?:main|nav)\b/i.test(content)) return false;
  // app/error.tsx and app/not-found.tsx retain the brand and outer document.
  if (/<[^>]*\bclass\s*=\s*["'][^"']*\broute-state-page\b/i.test(content)) return false;
  const titles = [...head.matchAll(/<title\b[^>]*>([^<]*)<\/title\s*>/gi)];
  if (titles.length !== 1 || titles[0][1].trim() !== pageTitles[path]) return false;
  const hasTag = (tag, expected) => [...head.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].some(([value]) => {
    const attributes = Object.fromEntries([...value.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(([, key, , val]) => [key.toLowerCase(), val]));
    return Object.entries(expected).every(([key, val]) => attributes[key] === val);
  });
  return hasTag("meta", { name: "application-name", content: "WAVE" })
    && ["/manifest.webmanifest", `${DEFAULT_BASE_URL}/manifest.webmanifest`]
      .some(href => hasTag("link", { rel: "manifest", href }));
}

async function pageCheck(path) {
  const startedAt = Date.now();
  // A pages-only recovery must never spend the API budget or retry the 14 GETs.
  const response = await fetchResponse(path, 20_000, pagesOnly ? 1 : 3);
  const body = await response.text();
  if (!/^text\/html(?:\s*;|$)/i.test(response.headers.get("content-type") || "")
    || !pageDocumentMatches(body, path)) throw new Error(`${path}에서 서비스 문서 계약을 확인하지 못했습니다.`);
  return { name: `page:${path}`, ms: Date.now() - startedAt };
}

try {
if (process.argv.slice(2).length && !pagesOnly) throw new Error("지원하지 않는 점검 옵션입니다.");
if (!pagesOnly) {
let configuredKeys = new Set();
checks.push(await jsonCheck("configuration", "/api/health", (body) => {
  const valid = body?.ok === true
    && body?.scope === "configuration"
    && Array.isArray(body?.keys)
    && body.keys.every((key) => key.optional || key.state === "configured");
  if (valid) configuredKeys = new Set(body.keys.filter((key) => key.state === "configured").map((key) => key.id));
  return valid;
}));
checks.push(await jsonCheck("weather", "/api/weather?region=%EC%B0%BD%EC%9B%90", (body) =>
  body?.source === "Open-Meteo" && Array.isArray(body?.days) && body.days.length >= 3));
checks.push(await jsonCheck("location", "/api/location-search?q=%EC%B0%BD%EC%9B%90%EC%8B%9C%EC%B2%AD", (body) =>
  Array.isArray(body?.places) && body.places.length > 0));
checks.push(await jsonCheck("map-config", "/api/map-config", (body) =>
  body?.provider === "kakao" && typeof body?.javascriptKey === "string" && body.javascriptKey.length > 0, 30_000));
checks.push(await jsonCheck("route", "/api/route?startLng=128.6818&startLat=35.2280&endLng=128.6921&endLat=35.2385", (body) => {
  const providers = new Map(Array.isArray(body?.providers) ? body.providers.map((provider) => [provider.id, provider]) : []);
  const connectedPublicIds = ["tago-bus-stop", "tago-bus-arrival", "tago-rail-catalog", "tago-express-catalog", "tago-intercity-catalog"];
  return body?.configured === true
    && Array.isArray(body?.alternatives)
    && body.alternatives.some((route) => route.provider === "Kakao Mobility" && route.configured)
    && providers.get("korail")?.configured === true
    && verifiedPublicTransport(providers.get("korail"), true)
    && connectedPublicIds.every((id) => verifiedPublicTransport(providers.get(id), id === "tago-bus-arrival"))
    && (!configuredKeys.has("odsay") || ["ready", "connected"].includes(providers.get("odsay")?.state));
}, 90_000));
checks.push(await jsonCheck("tourism:ko", "/api/wave?action=plan&region=%EA%B2%BD%EB%82%A8%20%EC%A0%84%EC%B2%B4&theme=nature&profiles=wheel&locale=ko", (body) =>
  Array.isArray(body?.statuses)
  && body.statuses.some((status) => status.id === "barrierfree" && status.state === "live")
  && body.statuses.every((status) => status.state !== "error")
  && ((body?.places?.length || 0) + (body?.explorationPlaces?.length || 0) > 0), 90_000));
checks.push(await jsonCheck("tourism:en", "/api/wave?action=plan&region=%EA%B2%BD%EB%82%A8%20%EC%A0%84%EC%B2%B4&theme=nature&profiles=wheel&locale=en", (body) =>
  Array.isArray(body?.statuses)
  && body.statuses.every((status) => status.state !== "error")
  && body.statuses.some((status) => status.id === "tour" && status.state === "live" && status.count > 0), 90_000));
checks.push(await jsonCheck("tourism:enrichment", "/api/wave?action=enrich&region=%EC%B0%BD%EC%9B%90&theme=nature&locale=ko", (body) =>
  Array.isArray(body?.statuses)
  && body.statuses.some((status) => status.state === "live")
  && body.statuses.every((status) => status.state !== "error")
  && (!configuredKeys.has("expressway") || ["live", "empty"].includes(body.statuses.find((status) => status.id === "rest")?.state)), 90_000));
checks.push(await jsonCheck("tourism:region-photo", "/api/wave?action=photo&region=%EC%B0%BD%EC%9B%90", (body) =>
  Boolean(body?.photo) && body?.status?.state === "live", 30_000));
checks.push(await jsonCheck("tourism:spot-photo", "/api/wave?action=spot-photo&region=%EC%B0%BD%EC%9B%90&title=%EA%B2%BD%EB%82%A8%EB%8F%84%EB%A6%BD%EB%AF%B8%EC%88%A0%EA%B4%80", (body) =>
  body?.status === "live" && typeof body?.image === "string" && body.image.startsWith("https://"), 30_000));
checks.push(await jsonCheck("tourism:crowd", "/api/wave?action=crowd&region=%EC%B0%BD%EC%9B%90&title=%EA%B2%BD%EB%82%A8%EB%8F%84%EB%A6%BD%EB%AF%B8%EC%88%A0%EA%B4%80", (body) =>
  body?.status?.state === "live", 30_000));
checks.push(await jsonCheck("tourism:accessible-parking", "/api/wave?action=parking-alternatives&contentId=2783785", (body) =>
  ["available", "empty"].includes(body?.status)
  && body?.contentId === "2783785"
  && body?.source === "전국주차장정보표준데이터"
  && typeof body?.checkedAt === "string"
  && Array.isArray(body?.items)
  && body.items.length <= 3
  && body.items.every((item) => item?.accessibleZone === "confirmed"
    && item?.destination && Number.isFinite(item.destination.latitude) && Number.isFinite(item.destination.longitude)
    && typeof item?.referenceDate === "string"), 90_000));
checks.push(await jsonCheck("community", "/api/community/posts?page=1", (body) => Array.isArray(body?.posts), 30_000));
checks.push(await jsonCheck("auth", "/api/auth/get-session", (body) => body === null || Boolean(body?.user), 30_000));
}
activeCheck = "pages";
const pages = Object.keys(pageTitles);
// Settle all started requests before recording their actual cost and results.
const pageResults = await Promise.allSettled(pages.map(pageCheck));
for (const [index, result] of pageResults.entries()) {
  if (result.status === "fulfilled") checks.push(result.value);
  else failedChecks.push(`page:${pages[index]}`);
}
if (providerBlock) throw new ProviderBlocked(providerBlock.failures, {
  engineeringRequired: providerBlock.engineeringRequired
    || pageResults.some(result => result.status === "rejected" && !(result.reason instanceof ProviderBlocked)),
});
if (failedChecks.length) throw new Error("서비스 문서 점검에 실패했습니다.");
reportResult({ ok: true, result: "passed" });
} catch (error) {
  if (!failedChecks.length) failedChecks.push(activeCheck);
  if (reportProviderBlock(error, {calls:budget.count(), file:resultFile})) {
    // Preserve the existing operational-hold result and GitHub outputs verbatim.
    reportResult(JSON.parse(readFileSync(resultFile, "utf8")));
  } else {
    // Names and counters only: never persist response bodies, URLs or raw errors.
    reportResult({ ok: false, result: "failed" });
  }
  process.exitCode = 1;
}

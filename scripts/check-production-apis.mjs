const DEFAULT_BASE_URL = "https://wave-barrier-free-gyeongnam.vercel.app";
const requestedBaseUrl = String(process.env.WAVE_PRODUCTION_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const baseUrl = new URL(requestedBaseUrl);
if (baseUrl.protocol !== "https:" || (baseUrl.hostname !== "wave-barrier-free-gyeongnam.vercel.app" && !baseUrl.hostname.endsWith(".vercel.app"))) {
  throw new Error("WAVE_PRODUCTION_BASE_URL은 승인된 Vercel HTTPS 주소여야 합니다.");
}

async function fetchResponse(path, timeoutMs = 65_000) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(new URL(path, `${baseUrl}/`), {
        headers: { Accept: path.startsWith("/api/") ? "application/json" : "text/html" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response;
      lastError = new Error(`${path} 응답 ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError instanceof Error ? lastError : new Error(`${path} 응답을 확인하지 못했습니다.`);
}

async function jsonCheck(name, path, validate, timeoutMs) {
  const startedAt = Date.now();
  const response = await fetchResponse(path, timeoutMs);
  const body = await response.json();
  if (!validate(body)) throw new Error(`${name} 응답 계약을 충족하지 못했습니다.`);
  return { name, ms: Date.now() - startedAt };
}

async function pageCheck(path) {
  const startedAt = Date.now();
  const response = await fetchResponse(path, 20_000);
  const body = await response.text();
  if (!body.includes("W.A.V.E")) throw new Error(`${path}에서 서비스 본문을 확인하지 못했습니다.`);
  return { name: `page:${path}`, ms: Date.now() - startedAt };
}

const checks = [];
checks.push(await jsonCheck("configuration", "/api/health", (body) =>
  body?.ok === true
  && body?.scope === "configuration"
  && Array.isArray(body?.keys)
  && body.keys.every((key) => key.optional || key.state === "configured")));
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
    && ["ready", "connected"].includes(providers.get("korail")?.state)
    && connectedPublicIds.every((id) => providers.get(id)?.state === "connected");
}, 90_000));
checks.push(await jsonCheck("tourism:ko", "/api/wave?action=plan&region=%EA%B2%BD%EB%82%A8%20%EC%A0%84%EC%B2%B4&theme=nature&profiles=wheel&locale=ko", (body) =>
  Array.isArray(body?.statuses)
  && body.statuses.some((status) => status.id === "barrierfree" && status.state === "live")
  && ((body?.places?.length || 0) + (body?.explorationPlaces?.length || 0) > 0), 90_000));
checks.push(await jsonCheck("tourism:en", "/api/wave?action=plan&region=%EA%B2%BD%EB%82%A8%20%EC%A0%84%EC%B2%B4&theme=nature&profiles=wheel&locale=en", (body) =>
  Array.isArray(body?.statuses)
  && body.statuses.some((status) => status.id === "tour" && status.state === "live" && status.count > 0), 90_000));
checks.push(await jsonCheck("tourism:enrichment", "/api/wave?action=enrich&region=%EC%B0%BD%EC%9B%90&theme=nature&locale=ko", (body) =>
  Array.isArray(body?.statuses) && body.statuses.some((status) => status.state === "live"), 90_000));
checks.push(await jsonCheck("tourism:region-photo", "/api/wave?action=photo&region=%EC%B0%BD%EC%9B%90", (body) =>
  Boolean(body?.photo) && body?.status?.state === "live", 30_000));
checks.push(await jsonCheck("tourism:spot-photo", "/api/wave?action=spot-photo&region=%EC%B0%BD%EC%9B%90&title=%EA%B2%BD%EB%82%A8%EB%8F%84%EB%A6%BD%EB%AF%B8%EC%88%A0%EA%B4%80", (body) =>
  body?.status === "live" && typeof body?.image === "string" && body.image.startsWith("https://"), 30_000));
checks.push(await jsonCheck("tourism:crowd", "/api/wave?action=crowd&region=%EC%B0%BD%EC%9B%90&title=%EA%B2%BD%EB%82%A8%EB%8F%84%EB%A6%BD%EB%AF%B8%EC%88%A0%EA%B4%80", (body) =>
  body?.status?.state === "live", 30_000));
checks.push(await jsonCheck("community", "/api/community/posts?page=1", (body) => Array.isArray(body?.posts), 30_000));
checks.push(await jsonCheck("auth", "/api/auth/get-session", (body) => body === null || Boolean(body?.user), 30_000));

const pages = [
  "/",
  "/planner",
  "/travel-book",
  "/photo-course",
  "/community",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/account",
  "/account/delete-complete",
  "/privacy",
  "/terms",
];
checks.push(...await Promise.all(pages.map(pageCheck)));

console.log(JSON.stringify({ ok: true, checkedAt: new Date().toISOString(), baseUrl: baseUrl.origin, checks }, null, 2));

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** @param {unknown} value */
function parsedUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * Production DB 연결은 명시적으로 TLS를 강제한다. 로컬 Postgres만 개발 환경에서
 * 예외로 허용하고, Preview와 Production은 같은 안전한 형식을 사용한다.
 * @param {unknown} value
 * @param {{ allowLocalhost?: boolean }} [options]
 */
export function securePostgresUrl(value, options = {}) {
  const url = parsedUrl(value);
  if (!url || !["postgres:", "postgresql:"].includes(url.protocol)) return null;
  if (!url.username || !url.password || !url.hostname || url.pathname.length <= 1 || url.hash) return null;
  if (options.allowLocalhost && LOCAL_DATABASE_HOSTS.has(url.hostname)) return url.href;
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  if (!new Set(["require", "verify-ca", "verify-full"]).has(sslMode || "")) return null;
  return url.href;
}

/**
 * 계정 프록시는 Neon이 발급한 HTTPS 호스트만 향하게 해 SSRF와 잘못된 운영 설정을
 * fail-closed 처리한다. 로컬 개발 주소는 Production 밖에서만 명시적으로 허용한다.
 * @param {unknown} value
 * @param {{ allowLocalhost?: boolean }} [options]
 */
export function approvedNeonAuthBaseUrl(value, options = {}) {
  const url = parsedUrl(value);
  if (!url || url.username || url.password || url.hash) return null;
  if (options.allowLocalhost && LOCAL_DATABASE_HOSTS.has(url.hostname) && ["http:", "https:"].includes(url.protocol)) {
    return url.href.replace(/\/$/, "");
  }
  if (url.protocol !== "https:" || (url.port && url.port !== "443")) return null;
  const hostname = url.hostname.toLowerCase();
  if (hostname !== "neon.tech" && !hostname.endsWith(".neon.tech")) return null;
  return url.href.replace(/\/$/, "");
}

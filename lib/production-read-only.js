export const PRODUCTION_ORIGIN = "https://wave-barrier-free-gyeongnam.vercel.app";

export function validateProductionOrigin(value = PRODUCTION_ORIGIN) {
  const url = new URL(value);
  if (url.origin !== PRODUCTION_ORIGIN || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Production QA only permits the canonical HTTPS origin");
  }
  return url.origin;
}

export function isReadOnlyMethod(method = "GET") {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

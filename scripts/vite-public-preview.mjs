// Opt-in local preview: read public WAVE data without copying production secrets.
// Authentication, private records, and every write keep the local backend.
export function publicPreviewReads() {
  const allowed = new Set(['/api/wave', '/api/festivals', '/api/route', '/api/weather', '/api/map-config', '/api/location-search', '/api/assistant']);
  return {
    name: 'wave:public-preview-reads', apply: 'serve', enforce: 'pre',
    configureServer(server) {
      if (process.env.WAVE_PUBLIC_PREVIEW !== '1') return;
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url || '/', 'http://localhost');
        if (request.method !== 'GET' || !(allowed.has(url.pathname) || /^\/api\/community\/posts(?:\/[a-zA-Z0-9-]+)?$/.test(url.pathname))) return next();
        try {
          const upstream = await fetch('https://wave-barrier-free-gyeongnam.vercel.app' + url.pathname + url.search, {
            headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25000), redirect: 'error',
          });
          response.statusCode = upstream.status;
          response.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
          response.setHeader('Cache-Control', 'no-store');
          response.end(Buffer.from(await upstream.arrayBuffer()));
        } catch {
          response.statusCode = 502;
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify({ error: 'Public data is temporarily unavailable.' }));
        }
      });
    },
  };
}

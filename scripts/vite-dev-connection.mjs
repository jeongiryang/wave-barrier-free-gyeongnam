/**
 * Nitro's development runner forwards requests through httpxy's keep-alive pool.
 * A busy Vite event loop can reuse a worker socket after its idle close but before
 * the close event is processed. Do not pool that local development hop. This does
 * not retry requests, intercept errors, or change the production server.
 * @returns {import("vite").Plugin}
 */
export function devWorkerConnection() {
  return {
    name: "wave:dev-worker-connection",
    apply: "serve",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        // WebSocket upgrades need their original hop-by-hop connection headers.
        if (!request.headers.upgrade) {
          request.headers.connection = "close";
          // srvx NodeRequest iterates rawHeaders when httpxy forwards it. Keep
          // that representation consistent with headers.get("connection").
          const rawHeaders = request.rawHeaders;
          if (rawHeaders) {
            for (let index = rawHeaders.length - 2; index >= 0; index -= 2) {
              if (rawHeaders[index].toLowerCase() === "connection") rawHeaders.splice(index, 2);
            }
            rawHeaders.push("Connection", "close");
          }
        }
        next();
      });
    },
  };
}

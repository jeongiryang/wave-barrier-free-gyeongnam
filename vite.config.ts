import vinext from "vinext";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { devWorkerConnection } from "./scripts/vite-dev-connection.mjs";
import { publicPreviewReads } from "./scripts/vite-public-preview.mjs";

export default defineConfig(async () => {
  const { nitro } = await import("nitro/vite");
  return {
    // Use the same Three release as PR #667, but keep its renderer in bounded,
    // lazy chunks instead of one 246 KiB gzip intro bundle.
    resolve: { alias: [{ find: /^three$/, replacement: fileURLToPath(new URL('./node_modules/three/src/Three.js', import.meta.url)) }] },
    // Three's math modules have shared initialization cycles (Vector3/Quaternion).
    // Size-bounded chunks must preserve their original module execution order.
    environments: { client: { build: { rolldownOptions: { output: { strictExecutionOrder: true, codeSplitting: { groups: [
      { name: 'intro-three', test: /node_modules[\\/]three[\\/]src[\\/]/, maxSize: 450_000, minSize: 60_000, priority: 30 },
    ] } } } } } },
    server: {
      host: "0.0.0.0",
      watch: { ignored: ["**/integration-*/**", "**/test-results*/**", "**/playwright-report/**", "**/*.log"] },
    },
    // Nitro owns requests and its worker owns the RSC module runner. Keep
    // vinext's complete plugin stack, with no second standalone HTTP handler.
    rsc: { serverHandler: false },
    plugins: [publicPreviewReads(), devWorkerConnection(), vinext(), nitro({
      vercel: {
        functions: {
          runtime: "nodejs22.x",
        },
      },
    })],
  };
});

import vinext from "vinext";
import { defineConfig } from "vite";
import { devWorkerConnection } from "./scripts/vite-dev-connection.mjs";

export default defineConfig(async () => {
  const { nitro } = await import("nitro/vite");
  return {
    server: {
      host: "0.0.0.0",
    },
    plugins: [devWorkerConnection(), vinext(), nitro({
      vercel: {
        functions: {
          runtime: "nodejs22.x",
        },
      },
    })],
  };
});

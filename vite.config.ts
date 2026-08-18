import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  const { nitro } = await import("nitro/vite");
  return {
    server: {
      host: "0.0.0.0",
    },
    plugins: [vinext(), nitro()],
  };
});

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const preset = process.argv[2];
if (preset !== "vercel") {
  console.error("Vercel 배포 프리셋이 필요합니다.");
  process.exit(1);
}

const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const result = spawnSync(process.execPath, [viteCli, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NITRO_PRESET: preset,
  },
});

process.exit(result.status ?? 1);

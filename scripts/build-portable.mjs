import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";

const preset = process.argv[2];
if (preset !== "vercel") {
  console.error("Vercel 배포 프리셋이 필요합니다.");
  process.exit(1);
}

const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
// Only generated deployment output. Preserve .vercel/project.json and all sources.
// Otherwise hashed assets from the preceding build can be deployed and counted twice.
const deploymentOutput = fileURLToPath(new URL("../.vercel/output/", import.meta.url));
rmSync(deploymentOutput, { recursive: true, force: true });
const result = spawnSync(process.execPath, [viteCli, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NITRO_PRESET: preset,
  },
});

process.exit(result.status ?? 1);

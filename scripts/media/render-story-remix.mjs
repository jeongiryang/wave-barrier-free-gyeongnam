// Recut the existing v2 illustrations as a silent, language-independent film.
// Usage: node scripts/media/render-story-remix.mjs <v2-image-directory> <output.mp4>
// Needs an already installed FFmpeg. No network, model API or package install.
// Sources: be1347fd62d821f4c7ff0622a0c9481c5fc2ab98, docs/media/wave-motion-v2/.
import { spawnSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import path from "node:path";

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Provide a v2 image directory and a new output MP4 path.");
const inputs = ["coast-dawn.webp", "garden-discovery.webp", "harbor-night.webp"].map(name => path.resolve(source, name));
for (const input of inputs) accessSync(input, constants.R_OK);
const filters = [
  "[0:v]scale=960:720,setsar=1,format=yuv420p[a]",
  "[1:v]scale=960:720,setsar=1,format=yuv420p[b]",
  "[2:v]scale=960:720,setsar=1,format=yuv420p[c]",
  "[a][b]xfade=transition=fade:duration=1:offset=6.67[ab]",
  "[ab][c]xfade=transition=fade:duration=1:offset=13.33[out]",
].join(";");
const result = spawnSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-n",
  ...inputs.flatMap(input => ["-loop", "1", "-framerate", "24", "-t", "8", "-i", input]),
  "-filter_complex_threads", "1", "-filter_complex", filters,
  "-map", "[out]", "-t", "20", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "25",
  "-threads", "2", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.resolve(output),
], { stdio: "inherit", shell: false });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`FFmpeg failed (${result.status}).`);

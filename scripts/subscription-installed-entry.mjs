// Executed only from the externally installed, fully hash-verified release.
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runOnce, tick } from "./subscription-run-once.mjs";
import { main as queueCommand } from "./subscription-queue-cli.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.env.WAVE_TRUSTED_INSTALLATION || path.resolve(process.env.WAVE_TRUSTED_INSTALLATION) !== path.resolve(root)) throw new Error("BLOCKED_SANDBOX: installed launcher required");
const [phase, issue, executable, repository, command, digest] = process.argv.slice(2);
if (!path.isAbsolute(repository || "")) throw new Error("BLOCKED_SANDBOX: repository data path required");
const result = phase === "queue" ? queueCommand([command, issue, digest]) : phase === "tick"
  ? tick(executable, { execute: options => runOnce({ ...options, repository }) })
  : runOnce({ phase, issue: Number(issue), executable, repository });
result.then(value => console.log(JSON.stringify(value))).catch(() => { console.error("BLOCKED_EXEC: preserve checkpoint; no automatic fallback"); process.exitCode = 1; });

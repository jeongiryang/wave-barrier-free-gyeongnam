import { spawnSync } from "node:child_process";
import { REPOSITORY, QUEUE_BRANCH } from "./subscription-queue.mjs";

// This transport is never given to the model process. gh uses existing local
// GitHub authentication; no token is read, copied, returned or logged here.
export function githubApi(endpoint, { method = "GET", body, allowMissing = false, run = spawnSync } = {}) {
  if (!endpoint.startsWith(`repos/${REPOSITORY}/`) && endpoint !== "user") throw new Error("INVALID_ENDPOINT");
  const args = ["api", endpoint, "--method", method];
  if (body !== undefined) args.push("--input", "-");
  const result = run("gh", args, { input: body === undefined ? undefined : JSON.stringify(body), encoding: "utf8", timeout: 30_000, maxBuffer: 4_000_000, windowsHide: true });
  if (result.status !== 0) {
    if (allowMissing && /HTTP 404/.test(result.stderr || "")) return null;
    if (/HTTP (409|422)/.test(result.stderr || "")) throw new Error("QUEUE_CONFLICT: another writer won; stop without retry");
    if (/HTTP (403|429)/.test(result.stderr || "")) throw new Error("BLOCKED_GITHUB: permission or rate limit; wait without retry");
    throw new Error("BLOCKED_GITHUB: request failed; no raw response logged");
  }
  try { return JSON.parse(result.stdout || "null"); } catch { throw new Error("INVALID_GITHUB_RESPONSE"); }
}

export class GitHubQueue {
  constructor(api = githubApi) { this.api = api; }
  async initialize(baseSha) {
    if (!/^[a-f0-9]{40}$/.test(baseSha)) throw new Error("INVALID_BASE");
    const ref = `repos/${REPOSITORY}/git/ref/heads/${QUEUE_BRANCH}`;
    if (await this.api(ref, { allowMissing: true })) return { created: false };
    // The branch contains operations metadata only. No workflow, model credential
    // or user content is installed on it, and no PR is opened for the state branch.
    const tree = await this.api(`repos/${REPOSITORY}/git/trees`, { method: "POST", body: { tree: [{ path: "README.md", mode: "100644", type: "blob", content: "# W.A.V.E shared execution state\n\nManaged by scripts/subscription-queue-cli.mjs. No credentials or user data. Human reviews remain required.\n" }] } });
    const commit = await this.api(`repos/${REPOSITORY}/git/commits`, { method: "POST", body: { message: "chore: initialize subscription execution state", tree: tree.sha, parents: [] } });
    await this.api(`repos/${REPOSITORY}/git/refs`, { method: "POST", body: { ref: `refs/heads/${QUEUE_BRANCH}`, sha: commit.sha } });
    return { created: true, sha: commit.sha, observedMain: baseSha };
  }
  async read(key) {
    if (!/^(?:issue-[1-9][0-9]*|events)$/.test(key)) throw new Error("INVALID_QUEUE_KEY");
    const file = await this.api(`repos/${REPOSITORY}/contents/.wave/queue/${key}.json?ref=${QUEUE_BRANCH}`, { allowMissing: true });
    if (!file) return { sha: null, value: null };
    if (file.type !== "file" || file.encoding !== "base64" || file.size > 250_000) throw new Error("INVALID_QUEUE_FILE");
    try { return { sha: file.sha, value: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) }; } catch { throw new Error("INVALID_QUEUE_FILE"); }
  }
  async write(key, expected, value) {
    if (!/^(?:issue-[1-9][0-9]*|events)$/.test(key)) throw new Error("INVALID_QUEUE_KEY");
    if (JSON.stringify(expected.value) === JSON.stringify(value)) return { changed: false, sha: expected.sha };
    const content = Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString("base64");
    if (content.length > 330_000) throw new Error("QUEUE_LIMIT: archive acknowledged events before adding more");
    const result = await this.api(`repos/${REPOSITORY}/contents/.wave/queue/${key}.json`, { method: "PUT", body: { message: `chore: update ${key} execution state`, branch: QUEUE_BRANCH, content, ...(expected.sha ? { sha: expected.sha } : {}) } });
    return { changed: true, sha: result.content.sha, commit: result.commit.sha };
  }
  async update(key, transition) {
    const expected = await this.read(key);
    const value = await transition(expected.value);
    const result = await this.write(key, expected, value);
    return { ...result, value };
  }
}

export async function pages(endpoint, api = githubApi) {
  const result = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await api(`${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error("INVALID_GITHUB_RESPONSE");
    result.push(...batch);
    if (batch.length < 100) return result;
  }
  throw new Error("QUEUE_LIMIT: pagination incomplete; do not claim complete coverage");
}

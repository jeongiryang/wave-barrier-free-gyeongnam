import { spawn } from "node:child_process";

export function assertIncludedQuota(result) {
  const quota = result?.rateLimitsByLimitId?.codex || result?.rateLimits;
  const windows = [quota?.primary, quota?.secondary].filter(Boolean);
  if (!quota?.primary || quota.rateLimitReachedType || quota.credits?.hasCredits !== false || quota.credits?.unlimited !== false || windows.some(window => !Number.isFinite(window.usedPercent) || window.usedPercent < 0 || window.usedPercent >= 95)) {
    throw new Error("BLOCKED_QUOTA: included usage or absence of credit fallback cannot be verified; wait, never buy credits");
  }
}

// Official local app-server protocol. No login/start, token export, model turn,
// credit purchase, earned reset, or account identifiers are requested or logged.
export function readSubscriptionQuota(executable, env, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["app-server", "-c", 'forced_login_method="chatgpt"', "-c", 'model_provider="openai"'], { env, cwd, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let buffer = "";
    let complete = false;
    const finish = (result) => {
      if (complete) return;
      complete = true; clearTimeout(timer); child.kill();
      if (result) resolve(result); else reject(new Error("BLOCKED_QUOTA: local quota lookup failed; no inference started"));
    };
    const timer = setTimeout(() => finish(), 20_000);
    const send = message => child.stdin.write(`${JSON.stringify(message)}\n`);
    child.on("error", () => finish()); child.on("exit", () => finish());
    child.stdin.on("error", () => finish()); child.stderr.on("data", () => {});
    child.stdout.on("data", chunk => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        let message; try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 1) {
          if (message.error) { finish(); return; }
          send({ method: "initialized" }); send({ id: 2, method: "account/rateLimits/read" });
        }
        if (message.id === 2) finish(message.error ? null : message.result);
      }
    });
    send({ id: 1, method: "initialize", params: { clientInfo: { name: "wave_subscription_quota_check", version: "1.0.0" } } });
  });
}

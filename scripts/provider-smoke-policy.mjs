import { appendFileSync, writeFileSync } from "node:fs";
import policy from "../.github/automation/provider-hold.cjs";

export const LIVE_SMOKE_REQUEST_BUDGET = 33;
export class ProviderBlocked extends Error {
  constructor(failures, {engineeringRequired = false} = {}) {
    super(engineeringRequired ? "BLOCKED_MIXED_PROVIDER: provider calls paused; additional failure needs engineering triage" : "BLOCKED_EXTERNAL: provider restriction; no automatic code-fix or provider retry");
    const safe = Array.isArray(failures) && failures.map(policy.safeFailure);
    if (!safe?.length || safe.some(value => !value)) throw Error("Unverified provider restriction");
    this.failures = safe;
    this.engineeringRequired = engineeringRequired === true;
  }
}

export function assertProviderAvailable(body) {
  const {failures,engineeringRequired} = policy.analyzeRestrictions(body);
  if (failures.length) throw new ProviderBlocked(failures,{engineeringRequired});
}

export function createSmokeBudget(limit = LIVE_SMOKE_REQUEST_BUDGET) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > LIVE_SMOKE_REQUEST_BUDGET) throw Error("Invalid live-smoke budget");
  let calls = 0;
  return { take() { if (calls >= limit) throw Error("LIVE_SMOKE_BUDGET_EXHAUSTED: stop without retry"); calls++; }, count: () => calls };
}

export function reportProviderBlock(error, { output = process.env.GITHUB_OUTPUT, file = "provider-smoke-result.json", calls = 0 } = {}) {
  if (!(error instanceof ProviderBlocked)) return false;
  const failures = new ProviderBlocked(error.failures).failures;
  const result = { version:1, result:error.engineeringRequired ? "blocked-mixed" : "blocked-external", ok:false, engineeringRequired:error.engineeringRequired, checkedAt:new Date().toISOString(), applicationRequests:calls, failures };
  writeFileSync(file, JSON.stringify(result,null,2)+"\n");
  if (output) appendFileSync(output, `provider_block=${JSON.stringify(failures)}\nprovider_engineering=${error.engineeringRequired}\n`);
  console.log(JSON.stringify(result));
  return true;
}

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export const PRODUCTION_HOST = 'wave-barrier-free-gyeongnam.vercel.app';

export function validDeploymentHealth(body, sha) {
  return /^[a-f0-9]{40}$/.test(sha || '') && body?.ok === true && body?.scope === 'configuration'
    && body?.commit === sha && typeof body?.checkedAt === 'string';
}
export async function waitForDeploymentHealth(sha, {
  fetchHealth = fetch, pause = sleep, now = Date.now, log = console.log,
  timeoutMs = 60_000, intervalMs = 5_000,
} = {}) {
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('A valid deployment SHA is required');
  const deadline = now() + timeoutMs;
  let attempt = 0;
  while (now() < deadline) {
    attempt += 1;
    try {
      const response = await fetchHealth(`https://${PRODUCTION_HOST}/api/health`, {
        cache: 'no-store', redirect: 'error',
        signal: AbortSignal.timeout(Math.max(1, Math.min(5_000, deadline - now()))),
      });
      const body = response.ok ? await response.json() : null;
      if (validDeploymentHealth(body, sha)) {
        log(`Verified deployed revision ${sha} (attempt ${attempt})`);
        return body;
      }
      const observed = /^[a-f0-9]{40}$/.test(body?.commit || '') ? body.commit : 'unverified';
      log(`Production verification attempt ${attempt}: HTTP ${response.status}, revision ${observed}`);
    } catch {
      log(`Production verification attempt ${attempt}: health unavailable`);
    }
    if (now() < deadline) await pause(Math.min(intervalMs, deadline - now()));
  }
  throw new Error('Production did not serve the expected healthy revision within the verification window');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--wait') {
    await waitForDeploymentHealth(process.env.DEPLOYMENT_SHA);
  } else {
    const body = JSON.parse(readFileSync(0,'utf8'));
    if (!validDeploymentHealth(body,process.env.DEPLOYMENT_SHA)) throw new Error('Deployment health or exact revision mismatch');
    console.log(`Verified deployed revision ${body.commit}`);
  }
}

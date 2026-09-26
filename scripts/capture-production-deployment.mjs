import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PRODUCTION_HOST } from './check-deployment-health.mjs';

export function productionDeploymentId(alias, projectId) {
  if (!projectId || alias?.alias !== PRODUCTION_HOST || alias.projectId !== projectId
    || alias.deletedAt || alias.redirect || !/^dpl_[a-zA-Z0-9]+$/.test(alias.deploymentId || '')
    || (alias.deployment && alias.deployment.id !== alias.deploymentId)) {
    throw new Error('Cannot identify the previous deployment of the Production alias');
  }
  return alias.deploymentId;
}

export async function captureProductionDeployment(env, fetchAlias = fetch) {
  const { VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID } = env;
  if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID) throw new Error('Vercel configuration is required');
  const url = new URL(`https://api.vercel.com/v4/aliases/${PRODUCTION_HOST}`);
  url.searchParams.set('teamId', VERCEL_ORG_ID);
  url.searchParams.set('projectId', VERCEL_PROJECT_ID);
  const response = await fetchAlias(url, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Production alias lookup failed (HTTP ${response.status})`);
  return productionDeploymentId(await response.json(), VERCEL_PROJECT_ID);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GITHUB_OUTPUT) throw new Error('GitHub step output is required');
  const id = await captureProductionDeployment(process.env);
  appendFileSync(process.env.GITHUB_OUTPUT, `deployment_id=${id}\n`);
  console.log(`Previous Production deployment: ${id}`);
}

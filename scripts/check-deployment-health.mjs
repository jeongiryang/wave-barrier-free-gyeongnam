import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function validDeploymentHealth(body, sha) {
  return /^[a-f0-9]{40}$/.test(sha || '') && body?.ok === true && body?.scope === 'configuration'
    && body?.commit === sha && typeof body?.checkedAt === 'string';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const body = JSON.parse(readFileSync(0,'utf8'));
  if (!validDeploymentHealth(body,process.env.DEPLOYMENT_SHA)) throw new Error('Deployment health or exact revision mismatch');
  console.log(`Verified deployed revision ${body.commit}`);
}

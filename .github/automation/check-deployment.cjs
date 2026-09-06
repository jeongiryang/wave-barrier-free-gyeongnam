"use strict";

async function checkDeployment({ github, context, core }) {
  const expected = context.payload.workflow_run.head_sha;
  const deployments = (await github.rest.repos.listDeployments({ ...context.repo, environment: "production", per_page: 10 })).data;
  if (!deployments.length) throw new Error("No Production deployment evidence");
  // Fail closed if a newer deployment is queued/in progress or belongs to a
  // different SHA. Do not attribute the mutable alias to an old CD run.
  const deployment = deployments[0];
  const statuses = (await github.rest.repos.listDeploymentStatuses({ ...context.repo, deployment_id: deployment.id, per_page: 1 })).data;
  if (deployment.sha !== expected || statuses[0]?.state !== "success") throw new Error("Production deployment changed or is not successful; rerun QA for the current deployment");
  await core.summary.addRaw(`Production deployment record ${deployment.id}; expected/source SHA ${expected}. Runtime smoke uses the canonical alias.\n`).write();
  return deployment.id;
}

module.exports = { checkDeployment };

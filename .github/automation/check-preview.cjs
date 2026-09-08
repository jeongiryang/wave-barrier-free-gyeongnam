const PROJECT_HOST = /^wave-barrier-free-gyeongnam-[a-z0-9]+-jeongiryang-projects\.vercel\.app$/;

function validatePreviewTarget({ url, sha, actualSha }) {
  if (!/^[a-f0-9]{40}$/.test(sha || "") || sha !== actualSha) throw new Error("Preview SHA must equal this workflow commit.");
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("Invalid Preview URL."); }
  if (parsed.protocol !== "https:" || !PROJECT_HOST.test(parsed.hostname) || parsed.port || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Only an immutable W.A.V.E Preview origin is allowed.");
  }
  return parsed.origin;
}

async function checkPreview({ github, context, core, url, sha, request = fetch }) {
  const origin = validatePreviewTarget({ url, sha, actualSha: context.sha });
  const repository = context.repo;
  const { data } = await github.rest.repos.listDeployments({ ...repository, sha, environment: "Preview", per_page: 100 });
  for (const deployment of data) {
    if (deployment.sha !== sha || deployment.environment !== "Preview") continue;
    const { data: statuses } = await github.rest.repos.listDeploymentStatuses({ ...repository, deployment_id: deployment.id, per_page: 1 });
    const latest = statuses[0];
    if (latest?.state === "success" && latest.environment_url?.replace(/\/$/, "") === origin) {
      const response = await request(`${origin}/planner`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
      await response.body?.cancel();
      if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) {
        throw new Error("blocked-preview-access: Preview is not anonymously readable. No authentication credentials will be copied.");
      }
      core.setOutput("url", origin);
      core.info(`Verified Preview deployment ${deployment.id} for ${sha}.`);
      return;
    }
  }
  throw new Error("No successful matching Preview deployment exists for this workflow commit.");
}

module.exports = { validatePreviewTarget, checkPreview };

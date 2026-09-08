"use strict";

// This policy is loaded from the reviewed PR base, never from candidate code.
// Unmapped/shared/infrastructure changes fail closed to the complete suite.
const common = ["e2e/core-journeys.spec.ts", "e2e/accessibility-final.spec.ts", "e2e/site-chrome-contrast.spec.ts"];
const weather = ["e2e/weather-language.spec.ts", "e2e/provider-quota-notices.spec.ts", "e2e/departure-readiness.spec.ts"];
const mapped = new Map([
  ["features/planner/weather-copy.ts", weather],
  ["features/planner/components/WeatherBoard.tsx", weather],
  ["features/planner/components/WeatherVisual.tsx", weather],
]);
const full = reason => ({ mode: "full", reason, specs: [] });

function selectImpact({ event, actor, owner, repository, pr, files }) {
  if (event !== "pull_request" || actor !== owner || pr?.user?.login !== owner ||
      pr?.head?.repo?.full_name !== repository || pr?.base?.ref !== "main" || pr.draft !== true) return full("release-or-untrusted");
  if (!Array.isArray(pr.labels) || pr.labels.some(label => label.name === "status:ready-for-qa")) return full("qa-request");
  if (!Number.isSafeInteger(pr.changed_files) || !Array.isArray(files) || !files.length || files.length !== pr.changed_files) return full("incomplete-diff");
  const specs = new Set(common);
  for (const file of files) {
    if (file.status !== "modified" || file.previous_filename || !/^[A-Za-z0-9_./-]+$/.test(file.filename || "") || file.filename.split("/").some(part => ["", ".", ".."].includes(part))) return full("uncertain-file");
    if (mapped.has(file.filename)) for (const spec of mapped.get(file.filename)) specs.add(spec);
    else if (/^e2e\/[a-z0-9-]+\.spec\.ts$/.test(file.filename)) specs.add(file.filename);
    else if (file.filename !== "README.md" && !/^docs\/[A-Za-z0-9_/-]+\.md$/.test(file.filename)) return full("unmapped-file");
  }
  return { mode: "fast", reason: "reviewed-impact-map", specs: [...specs].sort() };
}

async function plan({github,context,core}) {
  let result = full("release-or-missing-evidence");
  if (context.eventName === "pull_request") {
    const {data:pr} = await github.rest.pulls.get({...context.repo,pull_number:context.payload.pull_request.number});
    if (pr.head.sha === context.payload.pull_request.head.sha && pr.base.sha === context.payload.pull_request.base.sha) {
      const files = await github.paginate(github.rest.pulls.listFiles,{...context.repo,pull_number:pr.number,per_page:100});
      result = selectImpact({event:context.eventName,actor:context.actor,owner:context.repo.owner,repository:`${context.repo.owner}/${context.repo.repo}`,pr,files});
    }
  }
  core.setOutput("mode",result.mode);
  core.setOutput("specs",JSON.stringify(result.specs));
  core.info(`CI ${result.mode}: ${result.reason}; ${result.specs.length} selected specs; Full required before QA/merge.`);
}

module.exports = {selectImpact,plan};

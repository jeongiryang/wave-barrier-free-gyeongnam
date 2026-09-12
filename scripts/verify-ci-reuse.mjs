import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export const fullValidationJobs = ['quality', 'sandbox-boundary', 'validate', ...[1, 2, 3, 4].flatMap(shard => ['desktop', 'mobile'].map(device => `browser (${shard}, ${device})`))];
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);

/** Read-only certificate: unknown evidence always falls back to a full suite. */
export async function certifyValidation({ repository, commit, event, ref, get, readArtifact, now = Date.now() }) {
  const no = reason => ({ verified: false, reason });
  if (event !== 'push' || ref !== 'refs/heads/main' || !sha(commit) || !/^[\w.-]+\/[\w.-]+$/.test(repository)) return no('Only an exact main push can reuse a merged PR.');
  try {
    const prefix = `repos/${repository}`;
    const [main, associated, workflow] = await Promise.all([get(`${prefix}/git/commits/${commit}`), get(`${prefix}/commits/${commit}/pulls?per_page=30`), get(`${prefix}/actions/workflows/ci.yml`)]);
    if (!sha(main.tree?.sha) || main.sha !== commit || !workflow.id || !Array.isArray(associated)) return no('Missing commit or workflow evidence.');
    for (const associatedPr of associated.slice(0, 30)) {
      if (!Number.isSafeInteger(associatedPr.number)) continue;
      const pr = await get(`${prefix}/pulls/${associatedPr.number}`);
      if (!pr.merged || pr.merge_commit_sha !== commit || pr.base?.ref !== 'main' || pr.base?.repo?.full_name !== repository || pr.head?.repo?.full_name !== repository || !sha(pr.head?.sha)) continue;
      const head = await get(`${prefix}/git/commits/${pr.head.sha}`);
      if (head.sha !== pr.head.sha || head.tree?.sha !== main.tree.sha) continue;
      const runs = await get(`${prefix}/actions/workflows/ci.yml/runs?head_sha=${pr.head.sha}&event=pull_request&per_page=10`);
      // A new failed or running validation must never fall back to an older success.
      const latest = [...(runs.workflow_runs || [])].sort((a, b) => Date.parse(b.created_at || b.updated_at) - Date.parse(a.created_at || a.updated_at))[0];
      for (const run of latest ? [latest] : []) {
        const age = now - Date.parse(run.updated_at);
        if (run.workflow_id !== workflow.id || run.event !== 'pull_request' || run.head_sha !== pr.head.sha || run.status !== 'completed' || run.conclusion !== 'success'
          || run.repository?.full_name !== repository || run.head_repository?.full_name !== repository || !Number.isSafeInteger(run.id)
          || !Number.isFinite(age) || age < 0 || age > 7 * 86400000) continue;
        const result = await get(`${prefix}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
        const jobs = result.jobs;
        if (!Array.isArray(jobs) || result.total_count !== jobs.length) continue;
        if (!fullValidationJobs.every(name => jobs.filter(job => job.name === name).length === 1 && jobs.some(job => job.name === name && job.status === 'completed' && job.conclusion === 'success'))) continue;
        const artifacts = await get(`${prefix}/actions/runs/${run.id}/artifacts?name=ci-tree-proof&per_page=10`);
        const proofs = artifacts.artifacts?.filter(item => item.name === 'ci-tree-proof' && !item.expired && item.workflow_run?.id === run.id && Number.isSafeInteger(item.id));
        if (proofs?.length !== 1 || typeof readArtifact !== 'function') continue;
        const proof = await readArtifact(proofs[0].id);
        if (proof.version !== 1 || proof.repository !== repository || proof.runId !== run.id || proof.pr !== pr.number || proof.headSha !== pr.head.sha
          || proof.tree !== main.tree.sha || !sha(proof.checkoutSha) || !sha(proof.baseSha) || proof.checkoutSha !== proof.eventSha) continue;
        const tested = await get(`${prefix}/git/commits/${proof.checkoutSha}`);
        if (tested.sha !== proof.checkoutSha || tested.tree?.sha !== main.tree.sha || tested.parents?.length !== 2
          || tested.parents[0]?.sha !== proof.baseSha || tested.parents[1]?.sha !== proof.headSha) continue;
        return { verified: true, tree: main.tree.sha, pullRequest: pr.number, runId: run.id, url: `https://github.com/${repository}/actions/runs/${run.id}` };
      }
    }
    return no('No recent complete PR validation with an identical Git tree.');
  } catch { return no('Evidence lookup failed; running the full suite.'); }
}

async function main() {
  const get = async path => {
    const response = await fetch(`https://api.github.com/${path}`, { signal: AbortSignal.timeout(10000), redirect: 'error', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GH_TOKEN || ''}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) throw new Error('GitHub evidence unavailable');
    return response.json();
  };
  const repository = process.env.GITHUB_REPOSITORY;
  const readArtifact = async id => {
    const zip = execFileSync('gh', ['api', `repos/${repository}/actions/artifacts/${id}/zip`], { maxBuffer: 16384, timeout: 15000 });
    const parsed = execFileSync('python3', ['-c', 'import io,json,sys,zipfile\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nassert len(z.infolist())==1\nf=z.infolist()[0]\nassert f.filename=="ci-tree-proof.json" and f.file_size<=2048\nprint(json.dumps(json.loads(z.read(f))))'], { input: zip, maxBuffer: 8192, timeout: 5000, encoding: 'utf8' });
    return JSON.parse(parsed);
  };
  const result = await certifyValidation({ repository, commit: process.env.GITHUB_SHA, event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, get, readArtifact });
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `verified=${result.verified}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.verified ? `Browser and boundary validation reused from [PR #${result.pullRequest}](${result.url}). Identical Git tree: ${result.tree}. Quality, audit and build run again on main.\n` : `${result.reason}\n`);
  console.log(JSON.stringify(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

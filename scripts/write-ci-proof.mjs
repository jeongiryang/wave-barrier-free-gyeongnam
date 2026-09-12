import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const e = process.env;
const proof = { version: 1, repository: e.GITHUB_REPOSITORY, runId: Number(e.GITHUB_RUN_ID), pr: Number(e.PR_NUMBER), headSha: e.PR_HEAD_SHA, baseSha: e.PR_BASE_SHA,
  eventSha: e.GITHUB_SHA, checkoutSha: git(['rev-parse', 'HEAD']), tree: git(['rev-parse', 'HEAD^{tree}']) };
if (e.GITHUB_EVENT_NAME !== 'pull_request' || proof.checkoutSha !== proof.eventSha || !Number.isSafeInteger(proof.pr) || proof.pr <= 0
  || !Number.isSafeInteger(proof.runId) || [proof.headSha, proof.baseSha, proof.tree].some(value => !/^[a-f0-9]{40}$/.test(value || ''))) throw new Error('Cannot certify this checkout.');
writeFileSync(join(e.RUNNER_TEMP, 'ci-tree-proof.json'), JSON.stringify(proof));

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { verifyWorkflow } from './verify-deployment-ci.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const roles = ['naru','frontend-ux','frontend-fix','design','api','judge','traveler'];
const kinds = ['browser','live-api','local-llm','independent-qa','rendering','artifact','source-review'];
const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const head = () => execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();

export function validateContract(contract, fileExists = path => existsSync(resolve(root, path))) {
  if (contract.version !== 1 || contract.deadline !== '2026-09-30T23:59:59+09:00' || !contract.features?.length) throw new Error('Invalid release contract');
  const pages = new Set(), ids = new Set();
  for (const feature of contract.features) {
    if (!feature.id || ids.has(feature.id) || !feature.title || !roles.includes(feature.owner) || !['P0','P1'].includes(feature.priority)
        || !feature.acceptance?.length || !feature.evidenceKinds?.length || feature.evidenceKinds.some(kind => !kinds.includes(kind))
        || !feature.pages?.length || feature.pages.some(page => !Number.isInteger(page) || page < 1 || page > 31)) throw new Error(`Invalid feature ${feature.id}`);
    ids.add(feature.id); feature.pages.forEach(page => pages.add(page));
    for (const path of feature.tests || []) if (!/^(tests|e2e|e2e-production)\/[\w./-]+$/.test(path) || path.includes('..') || !fileExists(path)) throw new Error(`Missing test evidence path: ${path}`);
  }
  if (pages.size !== 31) throw new Error('Submission pages missing from the contract');
  for (const role of roles) if (!fileExists(`harness/personas/${role}.md`)) throw new Error(`Missing persona ${role}`);
  return true;
}

export function evidenceErrors(contract, evidence, sha, now = Date.now()) {
  const errors = [];
  if (evidence.schemaVersion !== 1 || evidence.commit !== sha) errors.push('Evidence must target the current exact commit');
  if (!Array.isArray(evidence.blockers) || evidence.blockers.length) errors.push('Unresolved blockers or missing blocker review');
  if (!evidence.fullAuditRunId || !/^\d+$/.test(String(evidence.fullAuditRunId))) errors.push('Full Release Audit run required');
  const records = Array.isArray(evidence.features) ? evidence.features : [];
  for (const feature of contract.features) {
    const matches = records.filter(record => record.id === feature.id);
    if (matches.length !== 1) { errors.push(`${feature.id}: one evidence record required`); continue; }
    const record = matches[0];
    for (const kind of feature.evidenceKinds) {
      const checks = (record.checks || []).filter(check => check.kind === kind);
      const check = checks[0];
      if (checks.length !== 1 || check?.status !== 'pass' || !check.evidence?.trim() || !check.reviewer?.trim()
          || !Number.isFinite(Date.parse(check.checkedAt)) || Date.parse(check.checkedAt) > now || now-Date.parse(check.checkedAt) > 7*86400000) errors.push(`${feature.id}/${kind}: current, attributed passing evidence required`);
    }
  }
  if (records.some(record => !contract.features.some(feature => feature.id === record.id))) errors.push('Unknown feature in evidence');
  for (const width of [1440,960,390]) if (!(evidence.rendering || []).some(item => item.width === width && item.status === 'pass' && item.evidence?.trim())) errors.push(`${width}px rendering evidence required`);
  if (evidence.naru?.source !== 'local-llm' || evidence.naru?.status !== 'pass' || !evidence.naru?.report) errors.push('Live approved local-llm evidence required');
  return errors;
}

async function main() {
  const [command = 'status', arg, ...options] = process.argv.slice(2);
  const contract = json('harness/features.json');
  validateContract(contract);
  if (contract.source?.path !== 'harness/submission-pages.json') throw new Error('Canonical submitted source is required');
  const deckBytes = readFileSync(resolve(root,contract.source.path));
  if (createHash('sha256').update(deckBytes).digest('hex') !== contract.source.sha256) throw new Error('Submitted source hash mismatch');
  if (command === 'check') {
    const quick = json('harness/quick-tests.json');
    const titles = new Set();
    for (const test of quick.tests) {
      const source = readFileSync(resolve(root, test.file),'utf8');
      if (titles.has(test.title) || (!source.includes(`test('${test.title}'`) && !source.includes(`test("${test.title}"`))) throw new Error(`Missing or duplicate quick test: ${test.title}`);
      titles.add(test.title);
    }
    console.log(`Contract valid: ${contract.features.length} requirements, 31 pages, 7 professional roles, ${quick.tests.length} quick journeys/device. No feature is certified by this structural check.`);
  } else if (command === 'status') {
    console.log(`Deadline: ${contract.deadline}\nAI Naru first. ${contract.features.length} requirements; acceptance status remains UNVERIFIED until evidence is supplied.`);
    for (const role of roles) console.log(`${role}: ${contract.features.filter(feature => feature.owner === role).length} owned requirements; npm run harness -- brief ${role} --task "bounded task"`);
  } else if (command === 'brief') {
    if (!roles.includes(arg)) throw new Error(`Role must be one of ${roles.join(', ')}`);
    const index = options.indexOf('--task');
    const task = index >= 0 ? options[index+1] : '';
    if (!task?.trim() || task.length > 4000) throw new Error('A bounded --task is required (up to 4000 characters)');
    console.log(readFileSync(resolve(root,`harness/personas/${arg}.md`),'utf8'));
    console.log(`\n사용자 작업: ${task}\n기준 커밋: ${head()}\n마감: ${contract.deadline}\n관련 요구사항(harness/features.json):`);
    for(const feature of contract.features.filter(feature => feature.owner === arg)) console.log(`- ${feature.id} [${feature.priority}] ${feature.title} (p${feature.pages.join(',')})`);
    console.log('\n명시된 작업 범위만 수행. 현재 관련 파일과 필요한 근거만 읽고 변경에 맞는 검사 한 번을 실행한다. 같은 실패 로그를 반복 출력하거나 API/에이전트를 자동 반복 호출하지 않는다.');
  } else if (command === 'template') {
    if (!arg || existsSync(resolve(root,arg))) throw new Error('Provide a new evidence file path; existing files are preserved');
    const evidence = {schemaVersion:1,commit:head(),fullAuditRunId:null,blockers:['미검증 항목을 실제 검증 후 해소'],rendering:[1440,960,390].map(width=>({width,status:'pending',evidence:''})),naru:{source:'local-llm',status:'pending',report:''},features:contract.features.map(feature=>({id:feature.id,checks:feature.evidenceKinds.map(kind=>({kind,status:'pending',evidence:'',reviewer:'',checkedAt:''}))}))};
    writeFileSync(resolve(root,arg),JSON.stringify(evidence,null,2)+'\n');
    console.log(`Created pending evidence template: ${arg}`);
  } else if (command === 'release') {
    if (!arg) throw new Error('Provide an evidence JSON file; no automatic completion is inferred');
    const evidence = json(arg), sha = head();
    const errors = evidenceErrors(contract,evidence,sha);
    if (errors.length) throw new Error(`Release NOT certified:\n${errors.join('\n')}`);
    if (execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim()) throw new Error('Tracked changes differ from the certified commit');
    const naru = json(evidence.naru.report);
    const requiredNaru = ['one-request-trip-intent','actual-itinerary-proposal','korean-count-and-region'];
    if (naru.source !== 'local-llm' || naru.status !== 'pass' || naru.commit !== sha
        || naru.base !== 'https://wave-barrier-free-gyeongnam.vercel.app'
        || !Number.isFinite(Date.parse(naru.checkedAt)) || Date.now()-Date.parse(naru.checkedAt)>86400000 || Date.parse(naru.checkedAt)>Date.now()
        || !Array.isArray(naru.checks) || naru.checks.length !== requiredNaru.length
        || requiredNaru.some(name=>naru.checks.filter(check=>check.name===name && check.status==='pass').length!==1)) throw new Error('Naru report must be fresh Production evidence for this exact deployed commit and all three live checks');
    const run = verifyWorkflow({sha,repository:'jeongiryang/wave-barrier-free-gyeongnam',workflow:'release-audit.yml',release:true,runId:evidence.fullAuditRunId});
    console.log(`Full automated audit verified: ${run.html_url}\nAll ${contract.features.length} feature evidence records present. Human/API claims remain attributed to their recorded reviewers; this command does not replace their review.`);
  } else throw new Error('Commands: status | check | brief <role> --task <text> | template <new.json> | release <evidence.json>');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error=>{console.error(error.message);process.exitCode=1;});

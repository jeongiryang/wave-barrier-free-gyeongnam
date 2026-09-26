import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const suite = JSON.parse(readFileSync(new URL('harness/quick-tests.json', root), 'utf8'));
const unique = new Set();
for (const { file, title } of suite.tests) {
  if (!/^e2e\/[a-z0-9-]+\.spec\.ts$/.test(file) || !title || unique.has(title)) throw new Error('Invalid/duplicate quick test');
  unique.add(title);
  const source = readFileSync(new URL(file, root), 'utf8');
  // Fail on renamed/deleted contract cases instead of silently grepping zero tests.
  if (!source.includes(`test('${title}'`) && !source.includes(`test("${title}"`)) throw new Error(`Quick contract missing: ${file}: ${title}`);
}
const args = process.argv.slice(2);
if (args.some(arg => /^(--grep|--grep-invert|--pass-with-no-tests|--last-failed|--only-changed|--test-list|--test-list-invert|--config|-g|-c)(=|$)/.test(arg))) throw new Error('Quick suite selection cannot be overridden');
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const grep = `(?:${suite.tests.map(({ title }) => escape(title)).join('|')})$`;
console.log(`Quick browser contract: ${suite.tests.length} journeys per device. Synthetic provider/account fixtures; live checks are separate.`);
const child = spawnSync(process.execPath, [fileURLToPath(new URL('scripts/run-playwright.mjs', root)), ...new Set(suite.tests.map(item => item.file)), '--grep', grep, ...args], { stdio: 'inherit', cwd: fileURLToPath(root) });
process.exitCode = child.status ?? 1;

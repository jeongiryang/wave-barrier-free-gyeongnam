import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const patterns = {
  naru: /^(assistant-|naru-|voice-|speech-|photo-|trip-command|trip-identity|trip-date-integrity|trip-recovery|travel-write-ownership)/,
  api: /(?:handler|provider|api|auth-|account-|security-boundaries|request-budget|anonymous-write|weather-|tourism-|route-|odsay-|kakao-|live-share|facility-evidence|database|migration)/,
};
const domain = process.argv[2];
if (!Object.hasOwn(patterns, domain)) throw new Error('Expected domain: naru | api');
const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(new URL('../tests/', import.meta.url)).filter(name => name.endsWith('.test.mjs') && patterns[domain].test(name)).sort().map(name => `tests/${name}`);
if (!files.length) throw new Error('No domain tests selected');
console.log(`${domain}: ${files.length} unit/contract files. Synthetic tests; no claim of live-provider success.`);
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
process.exitCode = result.status ?? 1;

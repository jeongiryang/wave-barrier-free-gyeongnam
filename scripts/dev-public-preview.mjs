// Local frontend with public production reads; writes and authentication stay local.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1', ...args], {
  stdio: 'inherit', env: { ...process.env, WAVE_PUBLIC_PREVIEW: '1' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });

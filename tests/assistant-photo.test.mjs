import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stripEncodedPhotoMetadata, validateAssistantPhoto } from '../lib/assistant-photo.js';

const jpeg = Buffer.from([255,216,255,192,0,11,8,0,20,0,20,1,1,17,0,255,218,0,2,1,255,217]);
const photo = data => ({ mimeType: 'image/jpeg', data: data.toString('base64') });
test('all JPEG scans are checked for private metadata and trailing payloads', () => {
  assert.ok(validateAssistantPhoto(photo(jpeg)));
  for (const marker of [225,237,254]) {
    const metadata = Buffer.from([255,marker,0,4,1,1]);
    for (const offset of [2, jpeg.length - 2]) assert.equal(validateAssistantPhoto(photo(Buffer.concat([jpeg.subarray(0, offset), metadata, jpeg.subarray(offset)]))), null);
  }
  assert.equal(validateAssistantPhoto(photo(Buffer.concat([jpeg, jpeg.subarray(-2)]))), null);
  const large = Buffer.from(jpeg); large.writeUInt16BE(2000, 7); assert.equal(validateAssistantPhoto(photo(large)), null);
});
test('canvas ICC metadata is removed before strict admission', () => {
  const withIcc = Buffer.concat([jpeg.subarray(0, 2), Buffer.from([255,226,0,6,73,67,67,0]), jpeg.subarray(2)]);
  assert.equal(validateAssistantPhoto(photo(withIcc)), null);
  const sanitized = stripEncodedPhotoMetadata(withIcc.toString('base64'));
  assert.equal(sanitized, jpeg.toString('base64'));
  assert.ok(validateAssistantPhoto({ mimeType: 'image/jpeg', data: sanitized }));
});
test('authenticated gateway applies image admission independently', () => {
  const result = spawnSync(process.env.WAVE_TEST_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), ['-I', '-B', fileURLToPath(new URL('../server/assistant/test-photo-gateway.py', import.meta.url))], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
});

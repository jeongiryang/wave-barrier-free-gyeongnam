import assert from "node:assert/strict";
import test from "node:test";
import { diskCapacity } from "../scripts/playwright-resource-reporter.mjs";

test("failure diagnostics expose aggregate capacity but discard arbitrary file/error data", () => {
  const receipt = diskCapacity(location => {
    if (location === "/home/runner") throw new Error("PUBLIC-DO-NOT-LOG: /outside/private-file");
    return { bsize: 4096, blocks: 100, bavail: 0, files: 50, ffree: 4, arbitrary: "PUBLIC-DO-NOT-LOG" };
  });
  assert.deepEqual(receipt.workspace, { bytes: 409600, availableBytes: 0, inodes: 50, availableInodes: 4 });
  assert.deepEqual(receipt.home, { available: false });
  assert.doesNotMatch(JSON.stringify(receipt), /PUBLIC-DO-NOT-LOG|private-file|arbitrary/);
});

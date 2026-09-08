import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { git } from "../scripts/subscription-publish.mjs";
import * as sandbox from "../scripts/subscription-sandbox.mjs";

function checkout() {
  const root = mkdtempSync(path.join(tmpdir(), "wave-doc-validation-test-"));
  mkdirSync(path.join(root, "docs"));
  writeFileSync(path.join(root, "docs/approved.md"), "# Current status\n\nNot activated.\n");
  writeFileSync(path.join(root, "docs/other.md"), "# Other work\n");
  // A documentation check must never start any of the candidate's npm hooks.
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ scripts: { pretest: "node candidate.mjs", test: "node candidate.mjs" } }));
  writeFileSync(path.join(root, "candidate.mjs"), "import {writeFileSync} from 'node:fs'; writeFileSync('candidate-executed', 'unexpected');\n");
  git(root, ["init"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "fixture: initial documentation"]);
  return root;
}

test("approved documentation is hashed as data without starting candidate scripts", () => {
  const root = checkout();
  const text = "# Current status\n\nHosted product CI is still required.\n";
  writeFileSync(path.join(root, "docs/approved.md"), text);
  const result = sandbox.documentationEvidence(root, ["docs/approved.md"]);
  assert.equal(result.result, "PASS");
  assert.equal(result.kind, "approved-documentation-data");
  assert.equal(result.productValidation.state, "pending-exact-head-ci");
  assert.equal(result.productValidation.source, "GitHub-hosted CI");
  assert.deepEqual(result.files, [{ path: "docs/approved.md", sha256: createHash("sha256").update(text).digest("hex") }]);
  assert.equal(existsSync(path.join(root, "candidate-executed")), false);
  assert.equal(git(root, ["status", "--porcelain"]).trim(), "M docs/approved.md");
});

test("unapproved documentation or application edits cannot obtain a bounded validation receipt", () => {
  for (const file of ["docs/other.md", "candidate.mjs", "package.json"]) {
    const root = checkout();
    writeFileSync(path.join(root, file), "changed\n");
    assert.throws(() => sandbox.documentationEvidence(root, ["docs/approved.md"]), /UNAPPROVED_DOCUMENTATION_CHANGE/);
    assert.equal(existsSync(path.join(root, "candidate-executed")), false);
  }
});

test("empty work, untracked additions and executable documentation fail before publication", () => {
  const empty = checkout();
  assert.throws(() => sandbox.documentationEvidence(empty, ["docs/approved.md"]), /EMPTY_DOCUMENTATION_CHANGE/);
  const untracked = checkout();
  writeFileSync(path.join(untracked, "docs/new.md"), "unapproved\n");
  assert.throws(() => sandbox.documentationEvidence(untracked, ["docs/approved.md"]), /UNAPPROVED_DOCUMENTATION_CHANGE/);
  for (const text of ["<script>unexpected()</script>", "[run](javascript:unexpected())", "x".repeat(100001), "bad\0text"]) {
    const root = checkout();
    writeFileSync(path.join(root, "docs/approved.md"), text);
    assert.throws(() => sandbox.documentationEvidence(root, ["docs/approved.md"]), /UNSAFE_DOCUMENTATION_RESULT/);
  }
});

test("bounded documentation path retains boundary checks while full product CI stays separate", async () => {
  const root = checkout();
  writeFileSync(path.join(root, "docs/approved.md"), "# Pending hosted validation\n");
  let touches = 0;
  const boundary = { result: "PASS", boundary: "linux-bwrap-v1", network: "isolated", filesystem: "isolated", checks: ["outside-files", "home-appdata-userprofile", "external-network", "local-network", "host-mounts"] };
  const calls = [];
  const result = await sandbox.validateDocumentationData(root, root, async () => { touches++; }, () => {}, {
    scope: ["docs/approved.md"],
    probe: () => { calls.push("probe"); return boundary; },
  });
  assert.deepEqual(calls, ["probe"]);
  assert.equal(touches, 2);
  assert.equal(result.productValidation.state, "pending-exact-head-ci");
  const evidence = JSON.parse(readFileSync(path.join(root, "documentation-validation.json"), "utf8"));
  assert.deepEqual(evidence.boundary, boundary);
  assert.equal(evidence.documentation.files.length, 1);
  assert.equal(existsSync(path.join(root, "candidate-executed")), false);
});

test("failed boundary stops heartbeat, document inspection and evidence writing", async () => {
  let touches = 0;
  await assert.rejects(sandbox.validateDocumentationData("unused", "unused", async () => { touches++; }, () => {}, {
    scope: ["docs/approved.md"], probe: () => { throw new Error("BLOCKED_SANDBOX"); },
  }), /BLOCKED_SANDBOX/);
  assert.equal(touches, 0);
});

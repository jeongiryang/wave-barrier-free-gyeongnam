import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
const { validatePreviewTarget, checkPreview } = createRequire(import.meta.url)("../.github/automation/check-preview.cjs");
const sha = "a".repeat(40), url = "https://wave-barrier-free-gyeongnam-example123-jeongiryang-projects.vercel.app";

for (const invalid of ["https://wave-barrier-free-gyeongnam.vercel.app", "http://127.0.0.1", url + ".attacker.example", url + "/planner", url + "?token=value", url.replace("https://", "https://user:password@"), url.replace("https:", "http:")]) {
  test(`Preview gate rejects non-immutable or credential-bearing input ${new URL(invalid).hostname}`, () => {
    assert.throws(() => validatePreviewTarget({ url: invalid, sha, actualSha: sha }));
  });
}
test("Preview gate rejects a stale HEAD and malformed SHA", () => {
  assert.throws(() => validatePreviewTarget({ url, sha, actualSha: "b".repeat(40) }));
  assert.throws(() => validatePreviewTarget({ url, sha: "main", actualSha: "main" }));
});
function fixture(status = "success", deployedSha = sha, deployedUrl = url) {
  const outputs = [], calls = [];
  return { outputs, options: {
    context: { sha, repo: { owner: "jeongiryang", repo: "wave-barrier-free-gyeongnam" } },
    url, sha, core: { setOutput: (...args) => outputs.push(args), info() {} },
    request: async (target, options) => {
      assert.equal(target, `${url}/planner`);
      assert.equal(options.redirect, "manual");
      return { status: 200, headers: new Headers({ "content-type": "text/html" }) };
    },
    github: { rest: { repos: {
      async listDeployments(options) { calls.push(options); return { data: [{ id: 1, sha: deployedSha, environment: "Preview" }] }; },
      async listDeploymentStatuses() { return { data: [{ state: status, environment_url: deployedUrl }] }; },
    } } },
  }, calls };
}
test("only a successful deployment matching the exact workflow SHA and origin is released", async () => {
  const good = fixture(); await checkPreview(good.options);
  assert.deepEqual(good.outputs, [["url", url]]);
  assert.equal(good.calls[0].sha, sha);
  for (const options of [["failure"], ["pending"], ["success", "b".repeat(40)], ["success", sha, url + ".attacker.example"]]) {
    const bad = fixture(...options); await assert.rejects(checkPreview(bad.options)); assert.deepEqual(bad.outputs, []);
  }
});

test("protected or unavailable Previews fail before publishing a URL to the test step", async () => {
  for (const status of [302, 307, 401, 403, 500]) {
    const blocked = fixture();
    blocked.options.request = async () => ({ status, headers: new Headers() });
    await assert.rejects(checkPreview(blocked.options), /blocked-preview-access/);
    assert.deepEqual(blocked.outputs, []);
  }
});

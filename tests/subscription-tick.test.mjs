import { test } from "node:test";
import assert from "node:assert/strict";
import { tick } from "../scripts/subscription-run-once.mjs";

test("one poll claims at most one approved task; a rerun does not regenerate a CI-pending result", async () => {
  const task = { order: { issue: 294, revision: "one", priority: "P1" }, state: "queued", updatedAt: 0 };
  let current = null, calls = 0, enqueue = 0;
  const options = {
    now: 1,
    queue: { read: async () => ({ value: current }) },
    scanInputs: async () => ({ events: [{ kind: "issue", id: 100, revision: "untrusted" }, { kind: "work_order", id: 294, revision: "one" }], openIssues: 2, openPulls: 1 }),
    command: async args => { if (args[0] === "enqueue") { enqueue++; current = task; } return { value: current }; },
    execute: async input => { calls++; assert.equal(input.issue, 294); assert.equal(input.phase, "implementation"); current = { ...task, state: "ci-pending" }; return { state: current.state }; },
  };
  assert.equal((await tick("fixture", options)).state, "ci-pending");
  assert.equal((await tick("fixture", options)).modelCalls, 0);
  assert.equal(calls, 1); assert.equal(enqueue, 1);
});

test("poll respects an existing owner and blocked quota, then prioritizes eligible independent QA", async () => {
  const tasks = [
    { order: { issue: 1, revision: "one", priority: "P0" }, state: "implementing", lease: { expiresAt: 100 }, updatedAt: 0 },
    { order: { issue: 2, revision: "two", priority: "P0" }, state: "blocked-quota", updatedAt: 0 },
    { order: { issue: 3, revision: "three", priority: "P1" }, state: "qa-ready", updatedAt: 0 },
  ];
  const current = issue => tasks.find(task => task.order.issue === Number(issue));
  let executed;
  await tick("fixture", {
    now: 1,
    queue: { read: async key => ({ value: current(key.slice(6)) }) },
    scanInputs: async () => ({ events: tasks.map(task => ({ kind: "work_order", id: task.order.issue, revision: task.order.revision })) }),
    command: async args => ({ value: current(args[1]) }),
    execute: async input => { executed = input; return {}; },
  });
  assert.equal(executed.issue, 3); assert.equal(executed.phase, "qa");
});

# #368 — measured CI feedback gates

Owner order: #365 minimum quota/no-loop → #368 Fast/Full → trusted subscription
canary → #353. Base main f4d5d9757451c5086aabaf78ee6ff31086c37368.

The previous #365 source f1c60b33c846741f6ad97f8a02a447283631ff2c passedCI855,
696unit/399desktop/398mobile+existing1skip and independentQA5142092814 before
PR370 merged. Production API7 actually stopped after5application requests for
ODsay quota_exhausted, created one operational hold#372; FailureRouter35
recorded no engineering fix loop. Full provider PASS was not claimed. MainCI856
subsequently found a landing render-readiness race; CD216 was skipped. Production
remains5e7ec6b5a969dec4928b55c3b169ab6767c0f089 until a new fully verified release.

Changes: reviewed-base conservative impact selection; separate Fast check name;
common unchanged quality/boundary and complete Full browser checks; exact Full
proof before queueQA/CD; idempotent trusted Full-label handoff; strict seven
caption visibility before original contrast measurement. See
[gate contract and measurements](../ci-feedback-gates.md).

Local implementation validation: actionlint1.7.12 and diff-checkPASS; CI-env gate
tests10PASS and landingcontrast desktop/mobile4PASS13.6s. Expanded full unit run
first reported703PASS/1FAIL because the existing DB test still located the old
inline overall-CI check. Its contract now requires the stronger secretless Full
dependency before the entire deployment job. Re-run704PASS/0FAIL/0skip; lint
0errors/2existingwarnings, typecheck, Vercelbuild and unchanged performance budgets
PASS. Production and full-development audits0. These are incremental local results,
not finalCI/Preview/QA/Production. Full browser and runtime packaging follow.
No test/skip/threshold weakening,
dependency change, ruleset change, paid API, new sandbox research or canary start.

Immutable packaging: source5f4ad788c4d2d8fc0a34aa3a84e5c702829e2f3e;
distribution61d40b0a24c06e55395b73daa73234750a8ce041, bootstrapSHA256
13d79d30fa03dd369bd1a4641c1c2ff31563028ffe2260b19ac65c70b5bbaaf2.
Downloaded immutable distribution matched; the same three frozen bootstrap
probesPASS before candidate execution. Pin-final704unitPASS. This repackages the
changed CI consumer, not additional sandbox hardening or executor activation.

Preservation: old49worktrees plus the newCI worktree; original10dirtyfiles remain
hash-identical; queue294generation5/attemptsimplementation2qa2 unchanged. All
CI856/earlier failure artifacts and C:/D: checkpoints retained.

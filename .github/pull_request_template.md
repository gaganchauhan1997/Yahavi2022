## Goal

What single change does this PR make, and why? Link the relevant issue/task if available.

## Focused scope and commits

- [ ] This PR has one logical purpose; unrelated features, refactors, formatting, and dependency updates are split into separate PRs.
- [ ] Each commit is focused on one logical change with a descriptive message; related tests accompany the behavior they cover. Avoid mixed/bulk commits.

## Tests and verification

Feature changes are expected to include automated tests for new or changed behavior in the same PR. Bug fixes should include a regression test that demonstrates the failure and verifies the fix.

Describe the tests added/updated and record the exact commands, working directories, and results (including any failures or checks not run):

- Automated behavior tests:
- Other relevant checks (for example, lint/build):

Lint/build checks do not replace behavior tests. There is currently no `test` script in `app/package.json`; do not report an unavailable command as passing.

If automated tests are unavailable or not applicable, explain why. For behavior changes without automated tests, provide reproducible manual steps, expected and actual results, and remaining risk for reviewer consideration. For documentation-only changes, explain why behavior tests are not applicable.

- Testing exception / documentation-only rationale (or N/A):
- Manual steps and expected/actual results (or N/A):
- Remaining risk (or N/A):

## Review checklist

- [ ] Tests accompany feature changes, or the testing gap and manual evidence are explicitly documented above for review.
- [ ] I reviewed the diff for unrelated changes and kept this PR focused.

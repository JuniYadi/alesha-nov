# CI: Add Bun Test Analytics (JUnit) to Codecov

## Summary

Enable Codecov Test Analytics for Bun test runs by adding JUnit XML output alongside existing LCOV coverage. This provides:

- **Flaky test detection** — Codecov tracks test history and flags flaky tests
- **Slow test analysis** — timing data in JUnit enables per-test performance insights
- **Centralized test reporting** — test results appear in the Codecov PR comment alongside coverage

## Changes

| Step | Before | After |
|------|--------|-------|
| Bun test | `--coverage --coverage-reporter=lcov` | Same + `--reporter=junit --reporter-outfile=./test-results/junit.xml` |
| Codecov upload 1 | `lcov.info` coverage | Same (unchanged) |
| Codecov upload 2 | — | `test-results/junit.xml` → `report_type: test_results` |

## Trigger

Runs on:
- `pull_request` to `main`
- `push` to `main` (main branch commits)

No new secrets required — `CODECOV_TOKEN` already exists in the repo.

## Test Plan

- [ ] CI passes on this PR
- [ ] Codecov PR comment shows **Test Results** tab
- [ ] Codecov PR comment shows **Coverage** tab (unchanged)
- [ ] JUnit XML is not empty (generated during test step)

## Technical Notes

- JUnit output written to `test-results/junit.xml` (mkdir created before test)
- `report_type: test_results` tells Codecov to treat the upload as test analytics, not coverage
- Both uploads use `fail_ci_if_error: true` — CI will fail if either upload errors
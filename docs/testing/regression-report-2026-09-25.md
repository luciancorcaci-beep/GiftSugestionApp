# Regression Test Report

**Date**: 2026-09-25
**Build**: Current (`b4ce562`, working tree unchanged) vs Previous (`docs/testing/validation-report-full-2026-09-25.md`, same commit)
**Tested By**: QA Agent
**Baseline**: `docs/testing/validation-report-full-2026-09-25.md` (auto-detected "latest")

---

## Summary

**Overall Status**: 🟢 NO REGRESSIONS

**New Failures**: 0
**Fixed Issues**: 0
**Flaky Tests**: 0

**Context**: No code has changed since the baseline validation report was written earlier today (`git log` still at `b4ce562`; only `docs/status.md` and the validation report itself, both documentation, are uncommitted). This run independently re-executes the full suite, coverage, lint, and typecheck rather than reusing the baseline's numbers, per the "ACTUALLY run the full test suite — never assume results" rule — confirming the recorded baseline is accurate and stable, not just trusting the prior report.

---

## Test Suite Comparison

| Category | Previous Build | Current Build | Change |
|----------|-----------------|----------------|--------|
| Total Tests | 145 | 145 | 0 |
| Passed | 145 | 145 | 0 |
| Failed | 0 | 0 | 0 |
| Skipped | 0 | 0 | 0 |
| Coverage (statements) | 96.73% | 96.73% | 0 |
| Coverage (branches) | 88.85% | 88.85% | 0 |
| Coverage (functions) | 92.39% | 92.39% | 0 |
| Coverage (lines) | 96.73% | 96.73% | 0 |
| Lint | Clean | Clean | 0 |
| Typecheck | Clean | Clean | 0 |

---

## New Failures (Regressions)

None.

---

## Regression Details

None — no new failures to investigate.

---

## Fixed Issues

None — no prior failures existed to fix.

---

## Flaky Tests

None observed. Full suite duration was stable (~1.2–1.3s) across both this run and the baseline run.

---

## Coverage Changes

**New Code Coverage**: 96.73% statements / 88.85% branches / 92.39% functions / 96.73% lines — unchanged from baseline.

No areas of increased or decreased coverage; no code changed between the two runs.

---

## Recommendations

1. ✅ No action required — release path remains clear.
2. Carried over from the baseline validation report (documentation-only, not a regression): `docs/testing/test-plan-full.md`'s REQ-4/TC-001 text still references the original 6 relationship values / 150 catalog entries, pre-dating Story 4.1's 12-relationship / 162-entry update. Recommend a housekeeping pass next time that file is touched.

---

## Evidence

```
 Test Files  16 passed (16)
      Tests  145 passed (145)
   Duration  1.32s

PASS: statements 96.73% (threshold 85%)
PASS: branches 88.85% (threshold 85%)
PASS: functions 92.39% (threshold 85%)
PASS: lines 96.73% (threshold 85%)
Coverage gate passed: all metrics ≥ 85%.

lint: clean (npm run lint)
typecheck: clean (npm run typecheck)
```

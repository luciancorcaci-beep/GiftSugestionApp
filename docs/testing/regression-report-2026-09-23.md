# Regression Test Report

**Date**: 2026-09-23
**Build**: Current (Story 4.1 — Expanded Relationship Options, uncommitted working tree) vs Previous (2026-09-18, Epic 3 full validation baseline)
**Tested By**: QA Agent

---

## Summary

**Overall Status**: 🟢 NO REGRESSIONS

**New Failures**: 0
**Fixed Issues**: 0 (none were failing at baseline)
**Flaky Tests**: 0

---

## Test Suite Comparison

| Category | Previous Build (2026-09-18) | Current Build (2026-09-23) | Change |
|----------|------------------------------|------------------------------|--------|
| Test Files | 16 | 16 | 0 |
| Total Tests | 128 | 150 | +22 |
| Passed | 128 | 150 | +22 |
| Failed | 0 | 0 | 0 |
| Skipped | 0 | 0 | 0 |
| Statement Coverage | 96.47% | 96.48% | +0.01% |
| Branch Coverage | 88.32% | 88.40% | +0.08% |
| Function Coverage | 92.63% | 92.63% | 0% |
| Line Coverage | 96.47% | 96.48% | +0.01% |
| Lint errors | 0 | 0 | 0 |
| Typecheck errors | 0 | 0 | 0 |
| Catalog entries | 150 | 162 | +12 (additive; original 150 byte-identical — see below) |

**What changed since baseline** (from `git status` / `git diff --stat`, and the story/review/plan docs):
- `src/domain/entities/GiftRecommendation.ts` — `RELATIONSHIPS` 6 → 12 values
- `src/components/forms/GiftForm.tsx` — dropdown now imports `RELATIONSHIPS` instead of a hardcoded duplicate
- `scripts/convert-gift-catalog.py` — added shared-strings XLSX support; default input now `Gift_Ideas_Database-V1.xlsx`
- `src/data/giftCatalog.json` — regenerated (150 → 162 entries, additive only)
- 5 test files modified with 22 new/updated test cases (`gift-input-validation.test.ts`, `gift-form.test.tsx`, `catalog-recommendation-provider.test.ts`, `gift-suggestions-api.test.ts`, `gift-catalog-loader.test.ts`)
- `scripts/convert-gift-catalog.py`'s shared-string lookup received one additional fix (clean-failure error handling) during code-review remediation (ISS-001)
- No changes to `validateGiftInput.ts`, `CatalogRecommendationProvider.ts`, middleware, error handling, logging, rate limiting, or any API route beyond what's listed above

---

## New Failures (Regressions)

None.

| Test ID | Test Name | Category | Previous | Current | Severity | Investigation |
|---------|-----------|----------|----------|---------|----------|----------------|
| — | — | — | — | — | — | — |

---

## Regression Details

None to report.

---

## Fixed Issues

None — no tests were failing at baseline, so there is nothing to report as newly fixed.

---

## Flaky Tests

None observed. Ran the full suite twice in this session (once during `aire-qa-validate`, once for this regression pass) with identical pass counts both times.

---

## Coverage Changes

**New Code Coverage**: 96.48% statements (+0.01% from the 96.47% baseline)

**Areas with Improved Coverage**:
- Branch coverage: 88.32% → 88.40% (+0.08%) — the new parametrized tests for the 6 new relationship values added branch coverage in `validateGiftInput.ts` and `CatalogRecommendationProvider.ts`'s relationship-matching logic

**Areas with Decreased Coverage**:
None. No module's coverage dropped.

---

## Requirements Regression Check

Spot-checked every requirement from the 2026-09-18 baseline report (`docs/testing/validation-report-full-2026-09-18.md`) that this change could plausibly touch, to confirm no silent behavior change:

| Baseline Requirement | Still holds? | Evidence |
|------------------------|---------------|-----------|
| REQ-4: Full relationship list | ✅ Intentionally widened (6→12), not broken — confirmed via `gift-form.test.tsx` and this cycle's own test plan REQ-1 | Not a regression — a planned, requirements-driven change (`docs/requirements.md` v1.2) |
| REQ-2: Exactly three recommendations for a valid request | ✅ Holds for all 12 relationship values now, not just the original 6 | `catalog-recommendation-provider.test.ts`, live curl checks in `validation-report-story-4.1-2026-09-23.md` |
| REQ-6: Catalog-based matching, no external AI call | ✅ Unaffected — no AI-related code touched | `grep` for `ClaudeRecommendationClient`/`anthropic.com` → still 0 matches |
| REQ-10: Abuse controls (rate limit, body cap) | ✅ Unaffected — `rateLimiter.ts`, `requestBody.ts` untouched by this story | `rate-limiter.test.ts`, `request-body.test.ts` unchanged and passing |
| REQ-14: Security headers / CSP | ✅ Unaffected — `middleware.ts` untouched | `security-headers.test.ts` unchanged and passing |
| REQ-17: Coverage ≥85% | ✅ Holds, improved slightly | See Test Suite Comparison above |
| REQ-19: Catalog data integrity (unique IDs) | ✅ Holds at the new 162-entry size | `gift-catalog-loader.test.ts` — unique-ID test re-run against 162 entries, still passes |
| REQ-20: No external AI/Claude dependency | ✅ Unaffected | Same grep-clean result as baseline |

No baseline requirement regressed. REQ-4's "6 values" language is superseded by design (per `docs/requirements.md` v1.2), not broken.

---

## Recommendations

1. No regressions found — no release-blocking action required.
2. Reiterating the process note from `aire-qa-validate`: the working tree is still uncommitted. This is a release-readiness gap, not a regression, but it means nothing here can actually ship yet.
3. Carried forward from baseline (unaffected by this change, still open): `next@13.5.11` CVE upgrade (`docs/status.md` Blockers: `NEXTJS-CVE`) and the `ConcurrencyLimiter` dead-code cleanup.

---

## Evidence

```
$ npm run test
Test Files  16 passed (16)
     Tests  150 passed (150)

$ npm run test:coverage
All files          |   96.48 |     88.4 |   92.63 |   96.48

$ node scripts/check-coverage.mjs
PASS: statements 96.48% (threshold 85%)
PASS: branches 88.4% (threshold 85%)
PASS: functions 92.63% (threshold 85%)
PASS: lines 96.48% (threshold 85%)
Coverage gate passed: all metrics ≥ 85%.

$ npm run lint && npm run typecheck
(both exit 0, no output)
```

Baseline comparison source: `docs/testing/validation-report-full-2026-09-18.md` (128/128 tests, 96.47%/88.32%/92.63%/96.47%).

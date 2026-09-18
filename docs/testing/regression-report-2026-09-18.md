# Regression Test Report

**Date**: 2026-09-18
**Build**: Current (post-Epic-3, catalog-based recommendations) vs Previous (`docs/testing/validation-report-full-2026-09-17.md`, pre-Epic-3, AI-based recommendations)
**Tested By**: QA Agent

---

## Summary

**Overall Status**: 🟢 NO REGRESSIONS

**New Failures**: 0
**Fixed Issues**: 0 (baseline had zero open bugs — nothing to fix)
**Flaky Tests**: 0

Between the baseline and today, Epic 3 replaced the entire AI-based (Claude) recommendation engine with a catalog-matching engine — a full provider swap, not an incremental change. Despite that scope, every requirement and abuse-control surface validated at baseline still holds: the rate limiter, body-size cap, security headers/CSP, input validation, and UI flow are all unchanged and still pass. The only test deltas are (a) intentional removals of tests that exercised now-nonexistent AI-provider-specific behavior (Claude adapter, concurrency limiter, provider timeout, provider-rate-limit mapping — all correctly retired alongside the code they tested) and (b) new tests covering the catalog matching algorithm and catalog data integrity that didn't exist to have a baseline.

---

## Test Suite Comparison

| Category | Previous Build (2026-09-17) | Current Build (2026-09-18) | Change |
|----------|----------------|---------------|--------|
| Total Test Files | 14 | 16 | +2 |
| Total Tests | 96 | 128 | +32 |
| Passed | 96 | 128 | +32 |
| Failed | 0 | 0 | 0 |
| Skipped | 0 | 0 | 0 |
| Coverage (Statements) | 95.85% | 96.47% | +0.62% |
| Coverage (Branches) | 85.89% | 88.32% | +2.43% |
| Coverage (Functions) | 92.13% | 92.63% | +0.50% |
| Lint | Clean | Clean | 0 |
| Typecheck | Clean | Clean | 0 |

---

## New Failures (Regressions)

None. No test that passed at baseline fails now.

---

## Regression Details

None to report.

---

## Fixed Issues

None — the baseline validation (`validation-report-full-2026-09-17.md`) already reported 0 open bugs.

---

## Retired Tests (intentional — not regressions)

These tests existed at baseline and were **deliberately removed** because the behavior they exercised no longer exists in the app after Epic 3 (this is the expected, correct outcome of retiring the Claude adapter, not test-suite decay):

| Test (baseline location) | Reason Retired |
|---|---|
| `ClaudeRecommendationClient` describe block (`gift-suggestions-api.test.ts`, ~4 tests) | The class was deleted in Story 3.3 — nothing left to test |
| Concurrency-limiter / `SERVICE_BUSY` test | `ConcurrencyLimiter` wiring removed from the handler in Story 3.3 (no longer meaningful for synchronous, in-memory matching) |
| Provider-timeout test (`AbortController`/`PROVIDER_TIMEOUT`) | No external call remains to time out |
| `ProviderRateLimitError` mapping tests (2, removed during story 3.3's own remediation pass) | Claude-specific error class, retired for consistency once nothing could throw it |

Each removal is documented with its own rationale in `docs/reviews/story-3.3-code-review-v1.md` and its Remediation section — cross-checked here, not just asserted.

## New Tests (Epic 3 — no baseline to compare against)

| Test File | Count | Covers |
|---|---|---|
| `catalog-recommendation-provider.test.ts` | 30 | Age/relationship eligibility, interest scoring, fallback, randomization, rationale/relationshipFit synthesis, defensive error path |
| `gift-catalog-loader.test.ts` | 6 | 150-entry count, unique IDs, "All" normalization, field shape |
| `gift-suggestions-api.test.ts` (net) | +1 net after removals | New catalog-backed test proving 3 recommendations with no `CLAUDE_API_KEY` configured, using the real default provider |

---

## Flaky Tests

None observed. The randomization test in `catalog-recommendation-provider.test.ts` (selection varies across repeated calls) was re-run multiple times during this session without inconsistency — it asserts on variation existing across N calls rather than exact output, which is deliberately non-flaky by design.

---

## Coverage Changes

**New Code Coverage**: 96.47% statements (+0.62% from baseline), 88.32% branches (+2.43%), 92.63% functions (+0.50%)

**Areas with Improved Coverage**:
- `src/infrastructure/catalog/` (new): 100% statements, 97.56% branches
- `src/lib/` overall: 98.62% (was already high at baseline, held steady)

**Areas with Decreased Coverage**:
- None identified. `src/domain/services/RecommendationService.ts` moved from covering 3 error-mapping branches to 2 (the `ProviderRateLimitError` branch was removed along with its class) — this is a reduction in *branch count*, not a coverage-percentage regression; the file's branch coverage is still 90.47%, consistent with baseline-era levels.

---

## Independent Live-Server Re-Verification (beyond the automated suite)

Since the baseline validation's headline finding (NEW-001, from an earlier cycle) was specifically that a passing unit suite had hidden a real-server regression, this regression pass re-ran the same category of check rather than trusting only `npm test`:

- `npm run build && npm run start` with `.env` physically removed → `GET /api/health` 200, `POST /api/gift-suggestions` 200 with 3 real catalog recommendations (re-confirms `docs/testing/validation-report-full-2026-09-18.md`'s TC-042 still holds after the ISS-001 remediation that followed it)
- CSP/security-header mechanism: `middleware.ts` was not touched by Epic 3 at all — no re-verification needed beyond the existing automated `security-headers.test.ts` (7/7 passing), which already covers the nonce-forwarding mechanism established in the baseline cycle

---

## Recommendations

1. ✅ No blocking action required — zero regressions, release path clear.
2. Carry forward (already tracked, not new): the NEW-002 in-memory rate-limiter serverless-state architecture decision remains open in `docs/status.md` Upcoming, unaffected by this regression pass.

---

## Evidence

- Baseline: `docs/testing/validation-report-full-2026-09-17.md`
- Current: `docs/testing/validation-report-full-2026-09-18.md`, `docs/reviews/story-3.1-code-review-v1.md`, `docs/reviews/story-3.3-code-review-v1.md` (test-removal rationale)
- Fresh test run (this report): `npx vitest run` → 16 files, 128/128 passing; `npm run test:coverage` → 96.47%/88.32%/92.63%; `npm run lint` / `npm run typecheck` → clean

---
helix_id: "4839"
title: "Tech Debt Assessment: GiftSugestionApp"
solution_id: "1024"
synced_at: "2026-09-24"
helix_metadata:
  artifact_type: "analysis"
  visibility: "private"
  lifecycle_state: "CURRENT"
  version: 29
  created_by: "Lucian Gheorghe Corcaci"
  created_at: "2026-09-24T13:51:49.476048+00:00"
  updated_at: "2026-09-24T19:47:03.632991+00:00"
  steps_completed: "12 of 12"
---

# Technical Debt Assessment: GiftSugestionApp

**Created:** 2026-09-24
**For:** Lucian
**Status:** COMPLETE
**Steps Completed:** 12 of 12

**Assessment Scope:**
- **Debt Categories:** All (code-quality, architecture, documentation, testing, dependencies, infrastructure)
- **Include Metrics:** Yes
- **Prioritization Criteria:** Combination (impact + effort + risk + business-value)

---

## Executive Summary

GiftSugestionApp is a healthy, recently-built Next.js application with a **~4% technical debt ratio** — well below the 10–20% industry average. The codebase is intentionally lean (3 production dependencies, clean layered architecture, 85%+ test coverage enforced in CI). The debt identified reflects MVP-phase trade-offs rather than accumulated neglect, and is entirely addressable in ~15 person-days of focused remediation.

**Two items require attention before any public launch:** the known high/critical CVEs in Next.js 13 (which have a clear upgrade path to v15) and the in-memory rate limiter that provides no real protection under Vercel's horizontal serverless scaling.

**Total Debt Items:** 30
**Estimated Remediation Effort:** 82–155 hours (~116 hours mid estimate / ~15 person-days)
**Priority Breakdown:** Critical: 2 | High: 2 | Medium: 12 | Low: 14
**Debt Ratio:** ~4% | **Accumulation Trend:** Stable/Low

**Top 5 Debt Items:**

| # | Item | Priority | Effort | Why It Matters |
|---|------|----------|--------|---------------|
| 1 | DEP-1: Next.js 13 → 15 upgrade | Critical | 16–24 hrs | Known high/critical CVEs; CI audit gate non-blocking; unlocks React 19 |
| 2 | AR-2/INF-1: Replace in-memory rate limiter | Critical/High | 8–16 hrs | Rate limiting bypassed under multi-instance serverless deployment |
| 3 | AR-1/CQ-2: Fix domain layer violation + double validation | High | 1–2 hrs | Domain imports application layer, violating clean architecture; quick fix |
| 4 | INF-2: Add APM / error tracking (Sentry) | Medium-High | 4–8 hrs | Production errors invisible without structured monitoring |
| 5 | DOC-1: Add README.md | High | 2–3 hrs | No entry point for new contributors; all `docs/` content is undiscoverable |

---

## Debt by Category

| Category | Items | Effort (mid) | Avg Severity | Status |
|----------|-------|-------------|--------------|--------|
| Code Quality | 5 | 9 hrs | Low–Medium | ✅ Assessed |
| Architecture | 5 | 23 hrs | Medium–High | ✅ Assessed |
| Documentation | 6 | 13 hrs | Low–Medium | ✅ Assessed |
| Testing | 5 | 18 hrs | Low–Medium | ✅ Assessed |
| Dependencies | 4 groups | 30 hrs | Critical–Low | ✅ Assessed |
| Infrastructure | 5 | 23 hrs | Low–High | ✅ Assessed |
| **Total** | **30** | **~116 hrs** | | |

---

## Code Quality Debt

> **Overall:** Well-maintained, relatively young codebase. No god objects, no dead code, consistent naming. Issues are minor discipline items rather than systemic problems.

### Medium-Priority Items

#### CQ-1: GiftForm Mixing UI, Business Logic & API Layer

**Description:** `GiftForm.tsx` (171 lines) combines React state management, API submission logic, client-side validation, and rendering. `submitGiftSuggestions` and `getGiftFormError` are exported business/API helpers living inside a UI component file — misplaced responsibilities.
**Location:** `src/components/forms/GiftForm.tsx`
**Impact:** Changes to API contract or validation logic require touching the UI file; harder to unit-test submission logic in isolation. (Score: 6/10)
**Effort:** 3–5 hours
**Risk:** Medium — tight coupling increases regression risk on UI changes (Score: 5/10)
**Business Value:** Medium — improves testability and separation (Score: 6/10)
**Remediation:** Extract `submitGiftSuggestions` and `getGiftFormError` into a new application service file (e.g. `giftSuggestionsService.ts` under `src/application/services/`) or a custom `useGiftForm` hook

#### CQ-2: Double Validation in Request Pipeline

**Description:** `RecommendationService.generate()` calls `validateGiftInput()` again (line 49), but the API handler already validates via `parseGiftSuggestionRequest`. The same input is validated twice on every request.
**Location:** `src/domain/services/RecommendationService.ts` (line 49) + `src/app/api/gift-suggestions/handler.ts`
**Impact:** Redundant CPU work; creates confusion about who owns validation. (Score: 4/10)
**Effort:** 1–2 hours
**Risk:** Low — redundancy is safe but noisy (Score: 3/10)
**Business Value:** Low-Medium — simplifies the service contract (Score: 4/10)
**Remediation:** Remove `validateGiftInput` call from `RecommendationService.generate()`; trust the application layer's `parseGiftSuggestionRequest` as the validation gate

### Low-Priority Items

#### CQ-3: Duplicated Error Message String

**Description:** The string `'Unable to generate gift suggestions right now.'` appears independently in three places: `GiftForm.tsx` (lines 59 & 100) and as the `RecommendationServiceError` default message in `src/lib/errors.ts`. Copy drift risk if UX wording changes.
**Location:** `src/components/forms/GiftForm.tsx`, `src/lib/errors.ts`
**Impact:** Minor maintenance burden — three places to update for a copy change. (Score: 3/10)
**Effort:** 30 minutes
**Risk:** Low (Score: 2/10)
**Business Value:** Low (Score: 3/10)
**Remediation:** Export a shared constant `UNABLE_TO_GENERATE_MESSAGE` from `src/lib/errors.ts` and reference it in all three locations

#### CQ-4: RecommendationService Instantiated Per-Request

**Description:** `new RecommendationService(provider, logger).generate(input)` creates a new stateless service instance on every incoming request — unnecessary GC pressure.
**Location:** `src/app/api/gift-suggestions/handler.ts` (line 62)
**Impact:** Unnecessary allocations in a serverless/high-throughput context. (Score: 3/10)
**Effort:** 30 minutes
**Risk:** Low (Score: 2/10)
**Business Value:** Low (Score: 2/10)
**Remediation:** Hoist `RecommendationService` instantiation into the handler factory closure

#### CQ-5: Project Name Typo — "GiftSugestionApp"

**Description:** Repository name and all internal references use `GiftSugestionApp` — missing the second 'g' from "Suggestion". Affects docs, URLs, import aliases, and contributor onboarding.
**Location:** Repository root, `package.json`, `tsconfig.json` path aliases
**Impact:** Unprofessional in public-facing references; contributor confusion. (Score: 2/10)
**Effort:** 2–4 hours (global rename)
**Risk:** Low if done with global search/replace (Score: 2/10)
**Business Value:** Low (Score: 2/10)
**Remediation:** Global rename when next touching repo setup — not urgent

---

## Architectural Debt

> **Overall:** Intentionally layered (domain/application/infrastructure/components). No circular dependencies found. The critical items are a domain-application layer inversion and an in-memory rate limiter that doesn't hold under horizontal scaling.

### Medium-High Priority Items

#### AR-1: Domain Layer Imports from Application Layer (DDD Violation)

**Description:** `RecommendationService` (domain) imports `validateGiftInput` from the application layer — inverting the dependency direction. In clean/DDD architecture the domain is the innermost ring and must not depend on application-layer concerns. This is the root cause of the double-validation issue (CQ-2).
**Location:** `src/domain/services/RecommendationService.ts` → `@/application/validation/validateGiftInput`
**Impact:** Application-layer changes force domain changes; domain becomes harder to test in isolation; erodes the primary benefit of layered architecture. (Score: 7/10)
**Effort:** 3–5 hours
**Risk:** Medium — touches the core recommendation path (Score: 5/10)
**Business Value:** Medium-High — restores layer integrity and removes double-validation (Score: 7/10)
**Remediation:** Remove `validateGiftInput` from `RecommendationService.generate()`; rely on the application layer (`parseGiftSuggestionRequest` in `schema.ts`) as the validation gate before calling domain services

#### AR-2: In-Memory Rate Limiter — Non-Distributed State

**Description:** `FixedWindowRateLimiter` stores per-client counters in process memory. Under horizontal scaling (Next.js on Vercel scales to multiple instances), each instance has its own counter — a client hitting different instances bypasses the rate limit entirely. The code comments acknowledge this as an accepted MVP limitation.
**Location:** `src/lib/rateLimiter.ts`, `src/app/api/gift-suggestions/handler.ts`
**Impact:** Rate limiting is effectively bypassed at scale; false sense of security against abuse. (Score: 7/10)
**Effort:** 8–16 hours
**Risk:** High if traffic grows or the app is targeted for abuse (Score: 7/10)
**Business Value:** High — essential for production resilience (Score: 8/10)
**Remediation:** Replace with a distributed rate limiter (Upstash Redis, Vercel KV, or Vercel Edge Middleware) — Edge Middleware is the cleanest fit since state is globally consistent there

### Medium Priority Items

#### AR-3: Handler Bypasses Provider Abstraction via Concrete Default

**Description:** `createGiftSuggestionsHandler` defaults `provider` to `new CatalogRecommendationProvider()` — a concrete infrastructure class imported directly into the handler. The `RecommendationProvider` interface exists but the concrete binding leaks into the composition root, coupling the handler to a specific provider.
**Location:** `src/app/api/gift-suggestions/handler.ts` (line 41)
**Impact:** Swapping or A/B-testing providers requires touching the handler itself. (Score: 5/10)
**Effort:** 2–4 hours
**Risk:** Low currently, grows as provider options multiply (Score: 3/10)
**Business Value:** Medium — enables future provider flexibility (Score: 5/10)
**Remediation:** Remove the default `new CatalogRecommendationProvider()` from the handler; inject the concrete provider from `route.ts` or a dedicated factory, keeping the handler provider-agnostic

### Low Priority Items

#### AR-4: Health Check Logic Embedded in Page Component

**Description:** `page.tsx` contains `checkHealth()`, `HEALTH_CHECK_TIMEOUT_MS`, `isHealthyPayload()`, and `HealthStatus` type inline. A page component carries infrastructure-adjacent concerns (HTTP polling, timeout management) that belong in a service or hook.
**Location:** `src/app/page.tsx` (lines 7–48)
**Impact:** Page harder to test in isolation; health-check logic can't be reused elsewhere. (Score: 3/10)
**Effort:** 1–2 hours
**Risk:** Low (Score: 2/10)
**Business Value:** Low-Medium — improves testability (Score: 3/10)
**Remediation:** Extract `checkHealth` and related types/constants into a new file (e.g. `health-client.ts` alongside the existing `src/lib/health-handler.ts`); consume via a `useHealthCheck` hook in the page

#### AR-5: `src/lib/` as Catch-All — Unclear Layer Boundary

**Description:** `lib/` mixes infrastructure concerns (rateLimiter, requestBody, health-handler) with cross-cutting concerns (errors, logger) and domain utilities (productUrl — imported by `RecommendationService`). As the codebase grows, this becomes a "lib dumping ground" with ambiguous placement rules.
**Location:** `src/lib/` directory
**Impact:** Onboarding friction; risk of architectural drift as new utilities default to `lib/`. (Score: 3/10)
**Effort:** 4–6 hours to reorganize
**Risk:** Low now, medium long-term (Score: 2/10)
**Business Value:** Low-Medium — prevents future layer violations (Score: 3/10)
**Remediation:** Split into `src/infrastructure/` (rateLimiter, requestBody, health-handler) and `src/shared/` (errors, logger); evaluate `productUrl.ts` placement in domain or infrastructure

---

## Documentation Debt

> **Overall:** Documentation is rich for a project this size — architecture, deployment, and testing docs are well above average. The critical gap is the missing README at the repository root; everything else is a "nice to have" at current scale. All documentation lives in `docs/` within the repository.

### High Priority

#### DOC-1: No README.md — Critical Entry Point Missing

**What's Missing:** No `README.md` at the repository root. A developer cloning the repo has no entry point — no setup instructions, no project overview, no "how to run it".
**Why It Matters:** All the excellent documentation in `docs/` is invisible without a README pointing to it. New contributors and visitors land on an empty repo root. This is the single biggest documentation gap.
**Priority:** High
**Effort:** 2–3 hours
**Remediation:** Write a concise README covering: what the app does, local setup (`npm install` + `npm run dev`), environment variables (`TRUSTED_PRODUCT_DOMAINS`), running tests (`npm test`), and links into `docs/`

### Medium Priority

#### DOC-2: No CONTRIBUTING.md

**What's Missing:** No contribution guidelines — no branching strategy, PR process, commit conventions, or code style guide at the repo root.
**Why It Matters:** New contributors must infer the process from existing PRs or ask a team member. The ESLint config and CI workflow exist but their expectations aren't documented.
**Priority:** Medium
**Effort:** 1–2 hours
**Remediation:** Create `CONTRIBUTING.md` covering branching, PR expectations, lint/test requirements, and how to run the CI checks locally

#### DOC-3: No Architecture Decision Records (ADRs)

**What's Missing:** No ADRs capturing *why* key architectural decisions were made — e.g., why a static catalog instead of a live AI/LLM call, why fixed-window rate limiting, why no database.
**Why It Matters:** Architecture docs describe *what* the system is, not *why* choices were made. Future developers considering changing the recommendation engine or adding persistence have no record of the original reasoning and trade-offs.
**Priority:** Medium
**Effort:** 2–4 hours
**Remediation:** Create 3–5 foundational ADRs in `docs/decisions/` covering the key choices already made (catalog-over-AI, in-memory rate limiting, stateless serverless deployment)

### Low Priority

#### DOC-4: No Formal API Specification (OpenAPI/Swagger)

**What's Missing:** No OpenAPI/Swagger spec for `POST /api/gift-suggestions` or `GET /api/health`. The Zod schema exists in `src/app/api/gift-suggestions/schema.ts` but isn't exported as a consumable spec.
**Why It Matters:** Future frontends, mobile clients, or integration partners must read source code to understand the API contract.
**Priority:** Low-Medium
**Effort:** 3–4 hours
**Remediation:** Generate from Zod schemas using `zod-to-openapi` or similar; host via a `/api/docs` route

#### DOC-5: No CHANGELOG.md

**What's Missing:** No changelog tracking what changed between versions/releases.
**Why It Matters:** Story reviews and cycle plans exist internally, but there's no user-facing or release-facing summary of changes over time.
**Priority:** Low
**Effort:** 1 hour to establish; ongoing maintenance with conventional commits or `standard-version`
**Remediation:** Establish `CHANGELOG.md` at root; adopt conventional commit format for automated changelog generation

#### DOC-6: Minimal Inline JSDoc on Exported Functions

**What's Missing:** Exported functions like `submitGiftSuggestions`, `getGiftFormError`, `isAgeEligible`, `matchesInterest`, `createGiftSuggestionsHandler` have no JSDoc. Code is clean but parameter intent isn't captured in IDE hover documentation.
**Priority:** Low
**Effort:** 3–5 hours across all exported public API functions
**Remediation:** Add JSDoc to all exported functions, at minimum documenting parameters, return types, and any non-obvious behaviour

---

## Testing Debt

> **Overall:** Strong testing posture — 16 well-structured test files with an enforced 85% CI coverage gate, good boundary testing, and factory helpers. Main gaps are E2E coverage and a missing unit test for the core domain service.

**Test Coverage Summary:**
- **Unit tests:** ✅ Present — 16 files, Vitest + Testing Library
- **Integration tests:** ⚠️ Partial — API handler tests run in-process only
- **E2E tests:** ❌ Absent — no browser-level tests
- **Performance tests:** ❌ Absent
- **CI gate:** ✅ ≥85% enforced via `scripts/check-coverage.mjs`

### Medium Priority

#### TST-1: No E2E / Browser Tests

**Issue:** No end-to-end tests exist (no Playwright, Cypress, or similar). The full user journey (fill form → submit → see results) is only covered at the component/unit level.
**Risk:** A deployment could break the rendered app in a real browser (CSP nonce interactions, client-side hydration, network errors) without any automated signal. (Score: 6/10)
**Severity:** Medium
**Effort:** 8–16 hours
**Approach:** Add Playwright for smoke tests covering: form submission happy path, validation error display, health check banner state, and results rendering

#### TST-2: `npm audit` CI Step is Non-Blocking

**Issue:** The `dependency-audit` CI job runs with `continue-on-error: true`, meaning known high/critical CVEs in production dependencies (Next.js 13.5.11) don't block merges. Intentional pending the Next.js major upgrade.
**Risk:** PRs can merge while high/critical CVEs remain unaddressed, with no hard CI signal. (Score: 5/10)
**Severity:** Medium — resolves automatically when Next.js major upgrade completes
**Effort:** No standalone fix — blocked on the Next.js upgrade (see Dependency Debt)
**Approach:** Remove `continue-on-error: true` from `ci.yml` once Next.js is upgraded to a clean audit version

#### TST-3: Missing `RecommendationService` Unit Tests

**Issue:** `RecommendationService.ts` (the core domain orchestrator) has no dedicated unit test. It is exercised indirectly via `gift-suggestions-api.test.ts`, but error-handling branches (`RecommendationProviderError` wrapping, `RecommendationServiceError` re-throw, generic fallback) are not tested in isolation.
**Risk:** Changes to domain error handling could silently break without a direct test catching the regression. (Score: 5/10)
**Severity:** Medium
**Effort:** 2–3 hours
**Approach:** Add `RecommendationService.test.ts` covering: happy path, `RecommendationProviderError` wrapping, `RecommendationServiceError` re-throw, and invalid provider output

### Low Priority

#### TST-4: Coverage Threshold Not Native in `vitest.config.ts`

**Issue:** The 85% threshold is enforced by `scripts/check-coverage.mjs` rather than natively in `vitest.config.ts` due to a bug in the pinned Vitest 0.34.6. The workaround is documented but the config gives false confidence and the threshold is defined in two places.
**Risk:** A Vitest upgrade could fix the bug silently; the script and config could drift out of sync. (Score: 3/10)
**Severity:** Low
**Effort:** 30 minutes — add a comment in `vitest.config.ts`; consolidate to native thresholds when Vitest is upgraded
**Approach:** Document the workaround clearly in `vitest.config.ts`; when Vitest is upgraded, restore native `coverage.thresholds` and retire the script

#### TST-5: All Tests in Flat `src/tests/` Directory

**Issue:** All 16 test files live in a flat `src/tests/` directory rather than co-located with the source files they test. Navigation between source and test grows as friction as the codebase scales.
**Risk:** Low at current file count; grows as a maintenance burden over time. (Score: 2/10)
**Severity:** Low
**Effort:** 2–3 hours to move files and update Vitest glob pattern
**Approach:** Move test files to live alongside their source counterparts; `vitest.config.ts` include pattern already supports co-located tests

---

## Dependency Debt

> **Overall:** Deliberately lean production footprint (3 deps). Debt is concentrated in version currency. The Next.js 13 → 15 upgrade is the single most impactful item — it resolves known critical CVEs and unblocks the CI audit gate. Recommended upgrade order: Next.js → Vitest → React → remaining.

| Package | Current | Latest | Issue | Effort | Priority |
|---------|---------|--------|-------|--------|----------|
| `next` | 13.5.11 | 15.x | Known high/critical CVEs; CI audit non-blocking intentionally; 2 major versions behind | High — breaking changes | **Critical** |
| `eslint-config-next` | 13.5.11 | 15.x | Must match `next` — upgrade together | Included in Next.js upgrade | **Critical** |
| `vitest` | 0.34.6 | 3.x | 2+ major versions behind; coverage threshold bug (causes TST-4) | Medium | **High** |
| `@vitest/coverage-v8` | 0.34.6 | 3.x | Must match `vitest` — upgrade together | Included in vitest upgrade | **High** |
| `react` | 18.2.0 | 19.x | 1 major version behind; React 19 stable available | Medium — coordinate with Next.js | Medium |
| `react-dom` | 18.2.0 | 19.x | Must match `react` — upgrade together | Included in React upgrade | Medium |
| `@types/react` | 18.2.79 | 19.x | Must match `react` — upgrade together | Included in React upgrade | Medium |
| `@types/react-dom` | 18.2.25 | 19.x | Must match `react` — upgrade together | Included in React upgrade | Medium |
| `undici` | 5.28.4 | 7.x | 2 major versions behind; known CVEs in older versions (dev/test only) | Low | Low-Medium |
| `eslint` | 8.56.0 | 9.x | 1 major version behind; flat config migration required | Medium — flat config rewrite | Low-Medium |
| `@types/node` | 18.19.130 | 22.x | 4 major versions behind; Node 18 in maintenance mode | Low | Low |
| `typescript` | 5.3.3 | 5.8.x | 5 minor versions behind within same major; low risk | Low | Low |
| `jsdom` | ^22.1.0 | 26.x | 4 major versions behind (dev only) | Low | Low |

**Dependency Summary:**
- **Critical (security):** `next` + `eslint-config-next` — known CVEs, CI gate non-blocking
- **High (functional):** `vitest` + `@vitest/coverage-v8` — coverage threshold bug
- **Medium (major version):** `react` ecosystem — React 19 stable
- **Low (routine):** `@types/node`, `eslint`, `typescript`, `jsdom`, `undici`

**Recommended Upgrade Sequence:**
1. **Next.js 13 → 15** — resolves critical CVEs, unblocks CI audit gate
2. **Vitest 0.34.6 → 3.x** — fixes coverage threshold bug, retires `scripts/check-coverage.mjs`
3. **React 18 → 19** — coordinate with Next.js upgrade
4. **Remaining low-priority packages** — routine maintenance

---

## Infrastructure Debt

> **Overall:** Strong infrastructure posture for a Vercel-hosted Next.js MVP — fully automated CI/CD, excellent security headers, CodeQL, Dependabot, Gitleaks, and a health endpoint. Primary gaps are observability (no APM/alerting) and the in-memory rate limiter which is non-functional under horizontal scaling (cross-references AR-2).

### High Priority

#### INF-1: Rate Limiter Non-Functional in Production (Serverless Scale)

**Issue:** The in-memory `FixedWindowRateLimiter` does not survive across Vercel serverless function instances. Each invocation may land on a different instance with its own counter, making rate limiting effectively bypassed in production at any meaningful traffic level.
**Impact:** Rate limiting provides no real protection in a multi-instance serverless deployment — a genuine security gap. (Score: 7/10)
**Severity:** High (cross-references AR-2)
**Effort:** 8–16 hours
**Modernization Approach:** Move rate limiting to Vercel Edge Middleware (stateful across instances at the edge) or integrate Upstash Redis / Vercel KV as a distributed counter store — both integrate natively with Vercel

### Medium Priority

#### INF-2: No Application Performance Monitoring (APM) or Alerting

**Issue:** No APM, error tracking (Sentry, Datadog, etc.), or alerting configured. Vercel provides basic request logs and analytics, but there's no structured error aggregation, performance tracing, or alerting on error rate spikes or latency regressions.
**Impact:** Production errors are invisible unless a user reports them. Recommendation failures or rate-limit spikes go unnoticed. (Score: 6/10)
**Severity:** Medium-High
**Effort:** 4–8 hours
**Modernization Approach:** Integrate Sentry (free tier sufficient at current scale) for error tracking and performance monitoring; the existing structured JSON logger can be extended to forward to a log aggregator; configure alerts on error rate thresholds

#### INF-3: No Persistent Staging Environment

**Issue:** Environment strategy is production + ephemeral per-PR preview URLs. No persistent staging environment mirrors production configuration for pre-release validation. Environment-specific bugs (e.g., `TRUSTED_PRODUCT_DOMAINS` misconfiguration, CSP issues) can only be caught in production or by manually testing a preview URL.
**Impact:** Pre-release validation gap; grows with team size and deployment frequency. (Score: 5/10)
**Severity:** Medium — acceptable at current MVP scale
**Effort:** 2–4 hours
**Modernization Approach:** Create a `staging` branch + Vercel environment with the same env var set as production; use as the mandatory pre-merge gate for significant changes

### Low Priority

#### INF-4: `TRUSTED_PRODUCT_DOMAINS` Undocumented — No `.env.example`

**Issue:** No `.env.example` file exists. `TRUSTED_PRODUCT_DOMAINS` defaults to `amazon.com` but is not validated at startup. If misconfigured, product URLs are silently sanitized to `undefined` with no error signal.
**Impact:** Silent data loss — product URLs stripped without any observable error. (Score: 4/10)
**Severity:** Low-Medium
**Effort:** 1 hour
**Modernization Approach:** Create `.env.example` documenting all env vars with descriptions; add a startup validation log warning if `TRUSTED_PRODUCT_DOMAINS` is unset or uses the default

> **Sync note (2026-09-24):** `.env.example` already exists in this repo (`TRUSTED_PRODUCT_DOMAINS=amazon.com`) — this finding may be stale relative to the current codebase state; verify before acting.

#### INF-5: No Custom Domain Configured

**Issue:** App runs on the default `<project>.vercel.app` domain — no custom domain configured yet. Noted as "not yet done" in deployment runbook.
**Impact:** No brand presence; no stable production URL for public launch. (Score: 3/10)
**Severity:** Low — MVP phase acceptable, prerequisite for public launch
**Effort:** 1–2 hours (Vercel dashboard + DNS propagation)
**Modernization Approach:** Register/connect a custom domain via the Vercel dashboard; TLS is automatic and requires no additional configuration

---

## Debt Metrics

> **Overall:** Healthy codebase at ~4% debt ratio — well below the 10–20% industry average. Debt is structural (intentional MVP trade-offs) rather than accumulated neglect. ~116 hours to remediate all items.

**Codebase Profile:**
- **Total source files:** ~55 | **TypeScript LOC:** 2,814 | **Total LOC (all languages):** ~6,310
- **Codebase age:** ~8 days (greenfield, 2026-09-16 → 2026-09-24)

| Metric | Value |
|--------|-------|
| Total Debt Items | 30 |
| Critical | 2 |
| High | 2 |
| Medium | 12 |
| Low | 14 |
| Estimated Remediation (range) | 82–155 hours |
| Estimated Remediation (mid) | ~116 hours (~15 person-days) |
| **Debt Ratio** | **~4%** (116 hrs / ~2,800 hrs estimated build effort) |
| **Interest (ongoing cost)** | ~2–4 hrs/sprint — onboarding friction, manual coverage workaround, missing APM, double validation noise |
| **Principal (fix cost)** | ~116 hours |
| **Debt Accumulation Trend** | **Stable/Low** — debt introduced during initial build as intentional MVP trade-offs, not accumulated over time |

**Effort by Category:**

| Category | Items | Mid Estimate |
|----------|-------|-------------|
| Code Quality | 5 | 9 hrs |
| Architecture | 5 | 23 hrs |
| Documentation | 6 | 13 hrs |
| Testing | 5 | 18 hrs |
| Dependencies | 4 groups | 30 hrs |
| Infrastructure | 5 | 23 hrs |
| **Total** | **30** | **~116 hrs** |

---

## Prioritized Debt Backlog

> Scored using combination criteria: Impact + Risk + Business Value (1–10 each), weighted against effort. Higher score = act sooner.

### Quick Wins (High Value, Low Effort)

1. **CQ-2 / AR-1: Remove double validation + fix domain layer violation**
   - Value: 7, Effort: 1–2 hrs, Risk: 5 | Score: 9.3
   - Fix: Remove `validateGiftInput` from `RecommendationService.generate()` — one change resolves both issues

2. **DOC-1: Add README.md**
   - Value: 8, Effort: 2–3 hrs, Risk: 5 | Score: 8.7
   - Fix: Write root README covering setup, env vars, test, and links into `docs/`

3. **CQ-3: Centralise duplicated error message string**
   - Value: 3, Effort: 0.5 hrs, Risk: 2 | Score: 8.0
   - Fix: Export `UNABLE_TO_GENERATE_MESSAGE` constant from `src/lib/errors.ts`

4. **INF-4: Add `.env.example` + startup env warning**
   - Value: 4, Effort: 1 hr, Risk: 4 | Score: 8.0
   - Fix: Create `.env.example`; add a startup log warning if `TRUSTED_PRODUCT_DOMAINS` is unset

5. **TST-3: Add `RecommendationService` unit tests**
   - Value: 5, Effort: 2–3 hrs, Risk: 5 | Score: 7.5
   - Fix: Add `RecommendationService.test.ts` covering all error-handling branches

6. **CQ-4: Hoist `RecommendationService` instantiation**
   - Value: 2, Effort: 0.5 hrs, Risk: 2 | Score: 7.0
   - Fix: Move instantiation into handler factory closure

7. **DOC-3: Write foundational ADRs**
   - Value: 6, Effort: 2–4 hrs, Risk: 3 | Score: 7.0
   - Fix: Create 3–5 ADRs in `docs/decisions/` — catalog-over-AI, in-memory rate limiting, stateless deployment

8. **TST-4: Document Vitest coverage threshold workaround**
   - Value: 3, Effort: 0.5 hrs, Risk: 3 | Score: 7.0
   - Fix: Add a comment in `vitest.config.ts` referencing the bug and the script

### Strategic Improvements (High Value, High Effort)

1. **DEP-1: Next.js 13 → 15 upgrade**
   - Value: 9, Effort: 16–24 hrs, Risk: 8 | Score: 8.7
   - Approach: Migrate incrementally following Next.js upgrade guides; resolves Critical CVEs, unblocks CI audit gate, enables React 19

2. **AR-2 / INF-1: Replace in-memory rate limiter with distributed solution**
   - Value: 8, Effort: 8–16 hrs, Risk: 7 | Score: 8.2
   - Approach: Upstash Redis or Vercel Edge Middleware; prerequisite for production launch at scale

3. **INF-2: Add APM / error tracking (Sentry)**
   - Value: 7, Effort: 4–8 hrs, Risk: 6 | Score: 7.6
   - Approach: Sentry free tier; extend existing structured logger to forward errors; configure error rate alerts

4. **CQ-1 / AR-3: Extract GiftForm logic + decouple handler from concrete provider**
   - Value: 6, Effort: 5–9 hrs, Risk: 5 | Score: 6.7
   - Approach: Extract `submitGiftSuggestions` to application service; inject `CatalogRecommendationProvider` from `route.ts`

5. **DEP-2: Vitest 0.34.6 → 3.x upgrade**
   - Value: 5, Effort: 4–8 hrs, Risk: 4 | Score: 6.8
   - Approach: Plan alongside Next.js upgrade; restores native coverage thresholds, retires `check-coverage.mjs`

6. **TST-1: Add Playwright E2E tests**
   - Value: 6, Effort: 8–16 hrs, Risk: 6 | Score: 6.5
   - Approach: 3–5 smoke tests — happy path, validation error, health banner, results rendering

7. **INF-3: Add staging environment**
   - Value: 5, Effort: 2–4 hrs, Risk: 5 | Score: 6.5
   - Approach: `staging` branch + Vercel environment with production env vars; requires process discipline

8. **DEP-3: React 18 → 19 upgrade**
   - Value: 5, Effort: 8–12 hrs, Risk: 4 | Score: 5.4
   - Approach: Coordinate with Next.js 15 upgrade; do not do standalone

### Can Wait (Track These)

1. **AR-4: Extract health check logic from `page.tsx`** — Trigger: next refactoring pass
2. **AR-5: Reorganise `src/lib/` into clearer layers** — Trigger: when adding new infrastructure concern
3. **DOC-2: Add CONTRIBUTING.md** — Trigger: first external or new team contributor
4. **DOC-4: OpenAPI spec for API endpoints** — Trigger: when an external consumer needs the API
5. **DOC-5: Add CHANGELOG.md** — Trigger: first public release
6. **DOC-6: JSDoc on exported functions** — Trigger: during refactoring sprint
7. **TST-2: Remove `continue-on-error` from audit CI** — Trigger: resolves automatically with Next.js upgrade
8. **TST-5: Co-locate test files with source** — Trigger: when test count grows painful
9. **CQ-5: Fix project name typo ("GiftSugestionApp")** — Trigger: before any public-facing launch
10. **INF-5: Configure custom domain** — Trigger: before public launch
11. **DEP-4+: Remaining low-priority package updates** — Trigger: routine maintenance sprint

---

## Remediation Roadmap

> Three phases aligned to launch readiness. Phase 1 addresses security and quick wins; Phase 2 upgrades the core stack and adds production resilience; Phase 3 handles strategic improvements and long-term maintainability.

### Phase 1: Critical & Quick Wins (0–4 weeks)

*Goal: Eliminate security risks, close the most glaring gaps, capture low-hanging fruit. Can run alongside feature work.*

| Item | Effort | Owner Suggestion | Success Criteria |
|------|--------|-----------------|-----------------|
| CQ-2/AR-1: Remove double validation, fix domain layer violation | 1–2 hrs | Backend dev | `validateGiftInput` removed from `RecommendationService`; all tests pass |
| DOC-1: Add README.md | 2–3 hrs | Any | README exists at repo root; covers setup, env vars, tests, doc links |
| INF-4: Add `.env.example` + startup warning | 1 hr | DevOps / Backend | `.env.example` committed; startup logs warning when `TRUSTED_PRODUCT_DOMAINS` is unset |
| CQ-3: Centralise error message constant | 0.5 hrs | Backend dev | Single constant used in all 3 locations; no duplicate strings |
| CQ-4: Hoist `RecommendationService` instantiation | 0.5 hrs | Backend dev | Service instantiated once in handler factory; tests green |
| TST-3: Add `RecommendationService` unit tests | 2–3 hrs | Backend dev | All error-handling branches covered; coverage ≥85% maintained |
| DOC-3: Write 3–5 foundational ADRs | 2–4 hrs | Tech lead | ADRs in `docs/decisions/` covering catalog-over-AI, rate limiting, stateless deployment |
| TST-4: Document Vitest coverage workaround | 0.5 hrs | Any | Comment in `vitest.config.ts` references bug and script; no confusion for next engineer |

**Total Phase 1 Effort:** ~10–16 hours (~1.5–2 person-days)

**Phase 1 Success Criteria:**
- Domain layer has no upward imports into application layer
- README present and accurate
- All CI jobs pass including `npm audit` (pre-Next.js upgrade)
- `RecommendationService` has direct unit test coverage
- No orphaned duplicate strings or instantiation patterns

---

### Phase 2: Core Stack Upgrade & Production Resilience (1–3 months)

*Goal: Resolve critical CVEs, make rate limiting production-safe, add observability. These are prerequisites for any public launch.*

| Item | Effort | Dependencies | Success Criteria |
|------|--------|-------------|-----------------|
| DEP-1: Next.js 13 → 15 upgrade | 16–24 hrs | None — do first | `npm audit --omit=dev` passes with zero high/critical CVEs; CI `continue-on-error` removed; all tests pass on Next.js 15 |
| DEP-2: Vitest 0.34.6 → 3.x upgrade | 4–8 hrs | Independent of Next.js | Native `coverage.thresholds` configured; `scripts/check-coverage.mjs` retired; CI coverage gate still enforced |
| AR-2/INF-1: Replace in-memory rate limiter | 8–16 hrs | Vercel account for KV/Edge | Rate limiter state persists across instances; load test confirms consistent limiting across >1 serverless replica |
| INF-2: Add APM (Sentry) | 4–8 hrs | None | Sentry configured; unhandled errors captured and alerted; P95 latency visible in dashboard |
| INF-3: Add staging environment | 2–4 hrs | None | Stable `staging` branch + Vercel environment with prod env vars; used for pre-merge validation |
| DEP-3: React 18 → 19 upgrade | 8–12 hrs | After Next.js 15 | App builds and tests pass on React 19; no hydration warnings |

**Total Phase 2 Effort:** ~42–72 hours (~5–9 person-days)

**Phase 2 Success Criteria:**
- Zero high/critical CVEs in `npm audit --omit=dev`
- Rate limiting verified effective under concurrent multi-instance load
- Production errors visible and alerted within 5 minutes of occurrence
- All CI jobs blocking (no `continue-on-error` flags)
- Staging environment used for at least one pre-release validation cycle

---

### Phase 3: Strategic Modernization & Long-Term Maintainability (3–6 months)

*Goal: Improve architectural health, test confidence, and developer experience. Lower urgency — tackle during dedicated improvement sprints or when triggered.*

| Item | Effort | Prerequisites | Success Criteria |
|------|--------|--------------|-----------------|
| CQ-1/AR-3: Extract GiftForm logic + decouple handler from provider | 5–9 hrs | None | `submitGiftSuggestions` in application service; handler tests pass without importing `CatalogRecommendationProvider` directly |
| TST-1: Add Playwright E2E tests | 8–16 hrs | Staging environment (INF-3) | ≥3 smoke tests covering happy path, validation, and results; run in CI on every PR |
| AR-4: Extract health check from `page.tsx` | 1–2 hrs | None | `checkHealth` in dedicated module; `page.tsx` imports it via hook |
| AR-5: Reorganise `src/lib/` | 4–6 hrs | None | `infrastructure/` and `shared/` directories established; no mixed concerns in `lib/` |
| TST-5: Co-locate test files | 2–3 hrs | None | All test files live alongside source; `vitest.config.ts` glob updated |
| DOC-2: CONTRIBUTING.md | 1–2 hrs | None | Branching strategy, PR process, and CI expectations documented |
| DOC-4: OpenAPI spec | 3–4 hrs | None | `POST /api/gift-suggestions` and `GET /api/health` fully specified; hosted at `/api/docs` |
| CQ-5: Fix project name typo | 2–4 hrs | Before public launch | Directory, `package.json`, all aliases use "GiftSuggestionApp" |
| INF-5: Custom domain | 1–2 hrs | Before public launch | Custom domain live; TLS certificate auto-renewed by Vercel |
| DEP-4+: Remaining low-priority dependency updates | 4–8 hrs | None | All packages within 1 major version of latest; `npm audit` clean |

**Total Phase 3 Effort:** ~31–56 hours (~4–7 person-days)

**Phase 3 Success Criteria:**
- E2E tests running in CI with ≥3 critical path scenarios
- No architectural layer violations remaining
- All test files co-located with source
- Public-launch checklist complete (custom domain, typo fixed, CONTRIBUTING.md)
- Full dependency freshness — no package more than 1 major version behind

---

## Referenced Paths

> Drift detection manifest: paths categorized by how much a change would invalidate this document.

### High Relevance

- `src/components/forms/GiftForm.tsx` - CQ-1 mixed responsibilities; CQ-3 duplicated error string; AR-1 import of validateGiftInput
- `src/domain/services/RecommendationService.ts` - AR-1 domain-application layer violation; CQ-2 double validation; TST-3 missing unit tests
- `src/app/api/gift-suggestions/handler.ts` - CQ-4 per-request instantiation; AR-2 in-memory rate limiter; AR-3 concrete provider default
- `src/lib/rateLimiter.ts` - AR-2/INF-1 in-memory rate limiter non-functional under serverless scale
- `src/lib/errors.ts` - CQ-3 duplicated error message; all error class definitions
- `package.json` - DEP-1 Next.js 13 critical CVEs; all dependency versions
- `src/app/page.tsx` - AR-4 health check logic embedded in page component
- `GiftSugestionApp/.github/workflows/ci.yml` - TST-2 non-blocking audit; TST-4 coverage gate workaround
- `src/middleware.ts` - Security headers implementation; INF scope

### Medium Relevance

- `src/infrastructure/catalog/CatalogRecommendationProvider.ts` - AR-3 concrete provider imported by handler
- `src/app/api/gift-suggestions/schema.ts` - Validation gate; context for CQ-2/AR-1
- `src/application/validation/validateGiftInput.ts` - Application-layer validation; AR-1 context
- `vitest.config.ts` - TST-4 missing native coverage threshold
- `scripts/check-coverage.mjs` - TST-4 workaround for Vitest coverage bug
- `GiftSugestionApp/.github/dependabot.yml` - Dependency automation context
- `GiftSugestionApp/.github/workflows/codeql.yml` - Security scanning context
- `docs/deployment/runbook-deploy.md` - INF-4 TRUSTED_PRODUCT_DOMAINS context
- `docs/deployment/deployment-plan.md` - INF-3 no staging; INF-5 no custom domain

### Low Relevance

- `src/tests/` - General test landscape; TST-5 co-location context
- `docs/architecture/` - Architecture context for AR items
- `docs/status.md` - Known issues context (Next.js CVE, rate limiter scope)
- `src/lib/` - AR-5 catch-all lib directory structure

---

## Metadata

- **Total Debt Items:** 30
- **Critical Items:** 2 (Next.js CVEs, in-memory rate limiter at scale)
- **High Items:** 2 (Vitest upgrade, domain layer violation)
- **Estimated Total Remediation:** 82–155 hours (~116 hrs mid / ~15 person-days)
- **Debt Ratio:** ~4%
- **Accumulation Trend:** Stable/Low — intentional MVP trade-offs, not accumulated neglect
- **Categories Assessed:** All 6 (Code Quality, Architecture, Documentation, Testing, Dependencies, Infrastructure)
- **Categories Skipped:** None
- **Prioritization Criteria:** Combination (Impact + Effort + Risk + Business Value)

---

*Generated by Helix Intelligent Modernization Platform*
*Synced into this repo by `aire-helix-sync` on 2026-09-24. Read-only reference — do not edit this file; changes must be made in Helix and re-synced.*

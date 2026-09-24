---
helix_id: "4871"
title: "Refactoring Strategy: GiftSugestionApp"
solution_id: "1024"
synced_at: "2026-09-24"
helix_metadata:
  artifact_type: "analysis"
  visibility: "private"
  lifecycle_state: "CURRENT"
  version: 24
  created_by: "Lucian Gheorghe Corcaci"
  created_at: "2026-09-24T19:50:59.732742+00:00"
  updated_at: "2026-09-24T19:56:39.821769+00:00"
  steps_completed: "10 of 10"
---

# Refactoring Strategy: GiftSugestionApp

**Created:** 2026-09-24
**For:** Lucian
**Status:** COMPLETE
**Steps Completed:** 10 of 10

**Strategy Scope:**
- **Refactoring Scope:** Full-system
- **Business Goals:** Combination (maintainability + performance + scalability)
- **Existing Analysis:** Tech Debt Assessment: GiftSugestionApp (12/12 steps, COMPLETE)

---

## Executive Summary

GiftSugestionApp has a clean, well-structured codebase with **8 identified hotspots**, concentrated in 3 high-priority files: `GiftForm.tsx` (mixed concerns, score 8.4), `validateGiftInput.ts` (highest CC:12, score 8.0), and `handler.ts` (concrete dependencies, score 7.0). Five refactorings are quick wins addressable in 1–2 sprints with zero behaviour change and low risk. The full three-phase strategy runs in ~35–62 hours alongside regular feature work.

The most impactful single change is **RF-3** (remove the domain→application layer violation) — one import deletion and one call removal, 1–2 hours, zero tests broken, architectural integrity restored. Phase 1 pays back its investment within 4–8 sprints through reduced friction alone.

**Total Refactoring Opportunities:** 9 (5 RF + 4 Pattern applications)
**Estimated Effort:** 35–62 hours (~5–8 person-days)
**Expected ROI:** CC avg 6.1 → ≤ 4; hotspot change risk eliminated; rate limiting fully effective at scale
**Quick Wins:** 5 items (Phase 1, 8–14 hrs total)
**Strategic Refactorings:** 4 items (Phases 2–3)

---

## Refactoring Hotspots

> Hotspot score = Complexity (1–10) × Change Likelihood (1–10). Codebase is 8 days old — change frequency inferred from structural coupling and debt findings rather than git churn, which is not meaningful at this age.

| Module/Component | Complexity | Change Likelihood | Hotspot Score | Priority |
|------------------|------------|-------------------|---------------|----------|
| `src/components/forms/GiftForm.tsx` | High (CC:7, 171 lines, mixed concerns) | High — UI changes frequent | **8.4** | 1 |
| `src/application/validation/validateGiftInput.ts` | High (CC:12, 8 functions) | High — validation rules evolve | **8.0** | 2 |
| `src/app/api/gift-suggestions/handler.ts` | Medium (CC:4, 75 lines, concrete deps) | High — API handler touched on every feature | **7.0** | 3 |
| `src/domain/services/RecommendationService.ts` | Medium (CC:7, 69 lines, layer violation) | Medium — core domain, changes carefully | **6.3** | 4 |
| `src/infrastructure/catalog/CatalogRecommendationProvider.ts` | Medium (CC:7, 137 lines) | Medium — catalog logic evolves with catalog | **6.3** | 5 |
| `src/app/page.tsx` | Medium (CC:6, 93 lines, embedded infra) | Medium — page layout changes | **5.4** | 6 |
| `src/lib/errors.ts` | Low (CC:2, 6 classes) | Low — stable error taxonomy | **3.0** | 7 |
| `src/lib/rateLimiter.ts` | Low (CC:3) | Low — stable until replaced | **2.0** | 8 |

**Top 3 Hotspots:**

1. **`GiftForm.tsx`** — Highest combined score. Mixed UI, API, validation, and state management in one 171-line component. Every change to the API contract, validation rules, or UI requires touching this file.
2. **`validateGiftInput.ts`** — Highest cyclomatic complexity (12) in the TypeScript codebase. 8 functions packed into 95 lines; validation rules will expand as the product grows.
3. **`handler.ts`** — API handler directly imports a concrete infrastructure class and instantiates the domain service per-request. Central to every API request; any provider or rate-limiter change requires touching it.

---

## Refactoring Opportunities

### RF-1: Extract Application Service from GiftForm (Extract Class)

**Hotspot:** `src/components/forms/GiftForm.tsx` (score 8.4)
**Technique:** Extract Class + Extract Method
**Current State:** `GiftForm.tsx` contains UI state management, API call logic (`submitGiftSuggestions`), client-side validation glue (`getGiftFormError`), and JSX rendering — all in 171 lines. The two helper functions are exported, meaning they're publicly coupled to a UI file.
**Proposed Change:** Extract `submitGiftSuggestions` and `getGiftFormError` into `src/application/services/giftSuggestionsService.ts`. Optionally wrap state + submission in a `useGiftForm` custom hook; the component becomes pure UI.
**Benefit:** Changes to API contract or validation no longer require touching the UI component; service is independently testable; component drops to ~80 lines of pure JSX.
**Effort:** 3–5 hours
**Risk:** Low — no external API contract change; existing tests cover the behaviour
**Business Value:** High — maintainability + directly unblocks testing the submission path in isolation

**Implementation Approach:**
1. Create a new file (e.g. `giftSuggestionsService.ts` under `src/application/services/`) and move `submitGiftSuggestions` + `getGiftFormError` into it
2. Update all import sites (`GiftForm.tsx`, test files)
3. Optionally extract a `useGiftForm` hook (new file under `src/hooks/`) from component state management
4. Verify all existing tests pass; add a service-level unit test

---

### RF-2: Simplify validateGiftInput Complexity (Extract Method + Guard Clauses)

**Hotspot:** `src/application/validation/validateGiftInput.ts` (CC:12, score 8.0)
**Technique:** Extract Method, Introduce Guard Clauses, Consolidate Validation Rules
**Current State:** Single file with 8 functions and CC:12 — the highest TypeScript complexity score. Validation rules for age, budget, relationship, and interests are spread across multiple small functions with nested conditionals.
**Proposed Change:** Introduce a `Validator` class or a `ValidationRule[]` array pattern — each field gets a declarative rule object `{ field, validate, message }` rather than imperative functions. The main `validateGiftInput` becomes a single-pass loop.
**Benefit:** Adding a new field or changing validation rules requires adding one rule object, not reading/modifying multiple functions. CC drops from 12 to ~4.
**Effort:** 3–4 hours
**Risk:** Low — fully covered by `gift-input-validation.test.ts`; behaviour unchanged
**Business Value:** High — maintainability; scales cleanly as relationship options and validation rules expand

**Implementation Approach:**
1. Define a `FieldRule` interface: `{ field: keyof GiftSuggestionRequest; validate: (v: unknown) => boolean; message: string }`
2. Replace per-field functions with a `FIELD_RULES` array
3. Replace the `validateGiftInput` body with a single `for...of` loop over rules
4. Run full test suite — no behaviour change expected

---

### RF-3: Fix Domain-Application Layer Violation (Move Method)

**Hotspot:** `src/domain/services/RecommendationService.ts` (score 6.3)
**Technique:** Move Method — remove cross-layer import
**Current State:** `RecommendationService.generate()` imports and calls `validateGiftInput` from the application layer (line 49). Domain imports application, violating clean architecture's dependency rule.
**Proposed Change:** Remove the `validateGiftInput` call from `RecommendationService.generate()`. Trust that the application layer (`parseGiftSuggestionRequest` in `schema.ts`) already validated the input before calling the domain service.
**Benefit:** Domain layer is self-contained; no upward imports; double validation eliminated; service contract clarified.
**Effort:** 1–2 hours
**Risk:** Low — the validation still happens in the application layer; behaviour is identical for valid inputs; invalid inputs are now rejected earlier (by design)
**Business Value:** High — architectural correctness; essential for long-term maintainability

**Implementation Approach:**
1. Remove `import { validateGiftInput }` from `RecommendationService.ts`
2. Remove the `validateGiftInput(input)` call on line 49; change the method signature to accept `GiftSuggestionRequest` directly
3. Add a `RecommendationService` unit test (TST-3) to verify the service trusts its input
4. Run full suite — all existing API-level tests should still pass

---

### RF-4: Decouple Handler from Concrete Provider (Introduce Parameter Object + Factory)

**Hotspot:** `src/app/api/gift-suggestions/handler.ts` (score 7.0)
**Technique:** Introduce Factory, Remove Default Concrete Dependency
**Current State:** `createGiftSuggestionsHandler` defaults `provider` to `new CatalogRecommendationProvider()` — a concrete infrastructure import inside the application handler. `RecommendationService` is also instantiated per-request.
**Proposed Change:** Remove the default `new CatalogRecommendationProvider()` from the handler. Move provider construction to `route.ts` (the composition root). Hoist `RecommendationService` instantiation into the factory closure.
**Benefit:** Handler becomes fully provider-agnostic; swapping or A/B-testing providers requires only touching `route.ts`; per-request GC pressure eliminated.
**Effort:** 2–3 hours
**Risk:** Low — dependency injection pattern; existing tests already inject via the `dependencies` parameter
**Business Value:** Medium — scalability + future provider flexibility

**Implementation Approach:**
1. Remove `import { CatalogRecommendationProvider }` from `handler.ts`; remove the default parameter value
2. In `route.ts`, construct `new CatalogRecommendationProvider()` and pass it explicitly to `createGiftSuggestionsHandler`
3. Hoist `new RecommendationService(provider, logger)` into the factory closure (outside the per-request function)
4. Verify existing handler tests still pass (they inject their own provider already)

---

### RF-5: Extract Health Check Logic from Page Component (Extract Method → Module)

**Hotspot:** `src/app/page.tsx` (score 5.4)
**Technique:** Extract Method → Extract Module
**Current State:** `page.tsx` contains `checkHealth()`, `isHealthyPayload()`, `HEALTH_CHECK_TIMEOUT_MS`, and `HealthStatus` type — 42 lines of infrastructure-adjacent code in a React page component.
**Proposed Change:** Move these to `src/lib/healthClient.ts`. Consume via a `useHealthCheck` React hook in the page component.
**Benefit:** Page becomes pure UI (<55 lines); health-check logic is independently testable and reusable; clear separation of concerns.
**Effort:** 1–2 hours
**Risk:** Low — no external API change; `home-page.test.tsx` already injects `fetchHealth` via the exposed `checkHealth` function
**Business Value:** Medium — maintainability

**Implementation Approach:**
1. Create a new `healthClient.ts` alongside the existing `src/lib/health-handler.ts`; move `checkHealth`, `isHealthyPayload`, `HEALTH_CHECK_TIMEOUT_MS`, `HealthStatus`
2. Create a new `useHealthCheck` hook under `src/hooks/` wrapping the `useEffect` + `useState` pattern from `page.tsx`
3. Update `page.tsx` to import from the new modules; update import paths in tests
4. Run full suite

---

## Design Pattern Recommendations

> Only patterns that address real, identified issues in this codebase — no gratuitous additions.

### Pattern 1: Strategy Pattern — Validation Rules

**Where to Apply:** `src/application/validation/validateGiftInput.ts`
**Problem It Solves:** The validation logic has CC:12 with 8 functions handling different fields imperatively. Adding a new validated field (e.g. a new relationship type or a `giftCount` field) requires adding new conditional branches and functions scattered across the file.
**Benefit:** Each validation rule becomes a self-contained, swappable `ValidationRule` object. Adding a rule = adding one object to an array. Zero change to the validation engine itself.
**Implementation:** Define a `ValidationRule` interface `{ field, validate, message }`; create a `FIELD_RULES` constant array; replace the function body with a single `for...of` loop. The pattern is already partially present — this formalises it.

---

### Pattern 2: Factory Pattern — Handler Composition Root

**Where to Apply:** `src/app/api/gift-suggestions/route.ts` + `handler.ts`
**Problem It Solves:** The handler currently constructs its own default dependencies (concrete provider, rate limiter) inline. This makes the handler responsible for both its logic AND its own wiring — a violation of single responsibility and a barrier to provider substitution.
**Benefit:** `route.ts` becomes the explicit composition root — the only place where concrete classes are named. The handler deals purely with request orchestration. Swapping the catalog provider for an AI/LLM provider in future touches only `route.ts`.
**Implementation:** `route.ts` constructs `new CatalogRecommendationProvider()` and passes it to `createGiftSuggestionsHandler({ provider, rateLimiter })`; remove all default concrete constructions from `handler.ts`.

---

### Pattern 3: Facade Pattern — Application Service for Gift Suggestions

**Where to Apply:** New application service consumed by `src/components/forms/GiftForm.tsx`
**Problem It Solves:** `GiftForm.tsx` directly calls fetch, parses the response, and handles errors — it acts as its own API client. Any change to the API contract, error handling, or response shape requires editing a UI component.
**Benefit:** The UI component talks to one stable interface (`submitGiftSuggestions(values)`); the service hides the fetch, serialisation, and error mapping. The component becomes a pure view.
**Implementation:** Extract `submitGiftSuggestions` and `getGiftFormError` into an application-layer service (RF-1). The Facade is the service's public interface — one function, one responsibility.

---

### Pattern 4: Repository / Provider Interface — Rate Limiter Abstraction

**Where to Apply:** `src/lib/rateLimiter.ts` → `src/infrastructure/`
**Problem It Solves:** `FixedWindowRateLimiter` is referenced directly by name in `handler.ts`. When replaced by a distributed rate limiter (Upstash, Edge Middleware), the handler must change too.
**Benefit:** Define a `RateLimiter` interface (`tryAcquire(key): boolean; retryAfterSeconds(key): number`). Both `FixedWindowRateLimiter` and any future distributed implementation satisfy it. The handler only depends on the interface.
**Implementation:** Extract `RateLimiter` interface from `rateLimiter.ts`; make `FixedWindowRateLimiter` implement it; update `handler.ts` to type the dependency as `RateLimiter`. When the distributed implementation is added, it drops in without touching the handler.

---

## Prioritized Refactorings

> Aligned with business goals: maintainability + performance + scalability. Scoring: Business Value + Impact (1–10) weighted against Effort and Risk.

### Quick Wins (High Value, Low Effort)

1. **RF-3: Fix domain-application layer violation** (Move Method)
   - Value: 9, Effort: 1–2 hrs, Risk: Low | Score: 9.5
   - Fix: Remove `validateGiftInput` from `RecommendationService`; eliminates double validation, restores clean architecture in one edit

2. **RF-4: Decouple handler from concrete provider + hoist service** (Factory)
   - Value: 7, Effort: 2–3 hrs, Risk: Low | Score: 8.5
   - Fix: Move `CatalogRecommendationProvider` construction to `route.ts`; instantiate `RecommendationService` once in factory closure

3. **RF-1: Extract application service from GiftForm** (Extract Class)
   - Value: 8, Effort: 3–5 hrs, Risk: Low | Score: 8.0
   - Fix: Move `submitGiftSuggestions` + `getGiftFormError` to application-layer service; component becomes pure UI

4. **Pattern 4: Introduce `RateLimiter` interface**
   - Value: 7, Effort: 1–2 hrs, Risk: Low | Score: 8.0
   - Fix: Extract interface from `rateLimiter.ts`; makes future distributed rate-limiter a drop-in with zero handler changes

5. **RF-5: Extract health check from page.tsx** (Extract Module)
   - Value: 5, Effort: 1–2 hrs, Risk: Low | Score: 7.5
   - Fix: Move `checkHealth` + types to `src/lib/`; page becomes pure UI

### Strategic Improvements (High Value, Higher Effort)

1. **RF-2: Refactor validation to Strategy Pattern** (Strategy + Guard Clauses)
   - Value: 8, Effort: 3–4 hrs, Risk: Low-Medium | Score: 7.8
   - Approach: Replace 8 imperative functions with declarative `FieldRule[]` array; CC drops 12 → ~4; each new rule is one object

2. **Pattern 2: Full Factory composition root in `route.ts`**
   - Value: 7, Effort: 2–3 hrs, Risk: Low | Score: 7.5
   - Approach: Complete the composition root so handler has zero concrete dependencies; enables future provider A/B testing

3. **Distributed rate limiter (Upstash/Edge Middleware)**
   - Value: 9, Effort: 8–16 hrs, Risk: Medium | Score: 7.0
   - Approach: Replace `FixedWindowRateLimiter` with a distributed implementation; `RateLimiter` interface (Pattern 4) makes this a drop-in

4. **Pattern 3: Facade service for GiftForm API**
   - Value: 6, Effort: 3–5 hrs, Risk: Low | Score: 6.5
   - Approach: Once RF-1 is done, formalise the extracted service as the single interface the UI component talks to

---

## Refactoring Roadmap

> All phases can run alongside feature work. No big-bang rewrites. Each phase leaves the codebase in a better, fully-working state than it started.

### Phase 1: Quick Wins (1–2 sprints)

*Goal: Eliminate layer violations, decouple the handler, extract the form service. No external behaviour changes.*

| Refactoring | Effort | Success Metric |
|-------------|--------|---------------|
| RF-3: Remove domain→application layer violation | 1–2 hrs | `RecommendationService` has zero imports from `@/application/`; all tests pass |
| Pattern 4: Introduce `RateLimiter` interface | 1–2 hrs | `handler.ts` types dependency as `RateLimiter`; `FixedWindowRateLimiter` implements it |
| RF-4: Decouple handler + hoist service instantiation | 2–3 hrs | `handler.ts` has zero concrete infrastructure imports; `RecommendationService` instantiated once |
| RF-5: Extract health check from `page.tsx` | 1–2 hrs | `page.tsx` < 55 lines; `checkHealth` in dedicated module; home-page tests still pass |
| RF-1: Extract GiftForm application service | 3–5 hrs | `GiftForm.tsx` < 90 lines of pure JSX/state; submission logic in application-layer module with its own unit test |

**Total Phase 1 Effort:** ~8–14 hours (~1–2 person-days)

**Phase 1 Success Metrics:**
- Zero upward imports (domain → application) in `RecommendationService.ts`
- `handler.ts` imports only interfaces, not concrete classes
- `GiftForm.tsx` line count < 90; cyclomatic complexity ≤ 4
- All 150+ existing tests pass unchanged

---

### Phase 2: Tactical Improvements (2–3 sprints)

*Goal: Refactor the highest-complexity source file; formalise the composition root; add the `RecommendationService` unit test.*

| Refactoring | Effort | Dependencies | Success Metric |
|-------------|--------|-------------|---------------|
| RF-2: Validation Strategy Pattern | 3–4 hrs | None | `validateGiftInput.ts` CC drops 12 → ≤ 4; `FIELD_RULES` array; all validation tests green |
| Pattern 2: Complete Factory composition root | 2–3 hrs | RF-4 done | `route.ts` is the only file that references concrete infrastructure classes |
| Add `RecommendationService` unit tests (TST-3) | 2–3 hrs | RF-3 done | All error-handling branches directly tested; coverage maintained ≥ 85% |

**Total Phase 2 Effort:** ~7–10 hours (~1 person-day)

**Phase 2 Success Metrics:**
- `validateGiftInput.ts` cyclomatic complexity ≤ 4
- `RecommendationService` has a dedicated test file covering all error branches
- Single composition root in `route.ts`

---

### Phase 3: Strategic Refactorings (4–8 sprints, coordinate with dependency upgrades)

*Goal: Replace the in-memory rate limiter with a distributed solution; add E2E tests; clean up lib/ structure. Coordinate with Next.js upgrade.*

| Refactoring | Effort | Prerequisites | Success Metric |
|-------------|--------|--------------|---------------|
| Distributed rate limiter (Upstash/Edge Middleware) | 8–16 hrs | Pattern 4 (RateLimiter interface) done | Rate limiting verified effective across >1 concurrent serverless instance |
| Add Playwright E2E smoke tests | 8–16 hrs | Staging environment | ≥ 3 critical-path browser tests passing in CI |
| Reorganise `src/lib/` into `infrastructure/` + `shared/` | 4–6 hrs | Phase 1 complete | No mixed concerns in `lib/`; clear directory conventions documented |

**Total Phase 3 Effort:** ~20–38 hours (~2.5–5 person-days)

**Phase 3 Success Metrics:**
- `npm audit` passes with zero `continue-on-error` flags (after Next.js upgrade)
- Rate limiting functional under horizontal scaling (load test verified)
- E2E tests catching browser-level regressions in CI

---

## Safety Practices

> Tailored to GiftSugestionApp's current setup: Vitest + Testing Library, 85%+ CI coverage gate, GitHub Actions CI, Vercel preview deployments per PR.

### Before Refactoring

- [ ] Confirm overall test coverage ≥ 85% (already enforced by CI gate)
- [ ] Verify the specific module being refactored has direct unit test coverage — if not, write tests first (particularly `RecommendationService` before RF-3)
- [ ] Create a dedicated branch for the refactoring (e.g. `refactor/domain-layer-violation`)
- [ ] Read the existing tests for the target module — they define the behaviour contract you must preserve
- [ ] For RF-1 (GiftForm extraction): document the current exported API surface (`submitGiftSuggestions`, `getGiftFormError`) before moving it

### During Refactoring

- [ ] Refactor in the smallest meaningful increment: one function move, one import removal, one class extraction at a time
- [ ] Run `npm test` after every meaningful change — do not accumulate multiple changes before testing
- [ ] Commit at each green state with a clear message (e.g. `refactor: move submitGiftSuggestions to application service`)
- [ ] For RF-2 (validation Strategy Pattern): keep the existing function signatures and just replace the body with the loop — reduces diff noise and simplifies review
- [ ] No feature flags needed for Phase 1 refactorings — all are pure internal rearrangements with no behaviour change
- [ ] For Phase 3 (distributed rate limiter): use a feature flag or environment variable to toggle between old and new implementation during rollout

### After Refactoring

- [ ] Full test suite passes: `npm test` — all 150+ tests green
- [ ] Coverage gate passes: `npm run test:coverage && node scripts/check-coverage.mjs`
- [ ] Lint clean: `npm run lint`
- [ ] Type check clean: `npm run typecheck`
- [ ] PR opened — Vercel preview deployment auto-created; smoke test the preview URL
- [ ] Code review completed — at minimum one reviewer who understands the affected module
- [ ] For Phase 2+ refactorings: validate via the Vercel preview that the live API still returns correct responses

### Rollback Plan

- Every refactoring is on its own branch — if anything goes wrong, the branch is abandoned and the PR is closed; `main` is never affected
- Vercel production deployments only happen on merge to `main` — a broken refactoring branch cannot reach production
- For Phase 3 (distributed rate limiter): the `RateLimiter` interface (Pattern 4) means the old `FixedWindowRateLimiter` can be restored by changing one line in `route.ts`

---

## Effort and Timeline

| Phase | Refactorings | Effort | Duration | Team Size |
|-------|--------------|--------|----------|-----------|
| 1: Quick Wins | 5 | 8–14 hrs | 1–2 sprints | 1 developer |
| 2: Tactical | 3 | 7–10 hrs | 1–2 sprints | 1 developer |
| 3: Strategic | 3 | 20–38 hrs | 4–8 sprints | 1–2 developers |

**Total:** ~35–62 hours (~5–8 person-days) across 3 phases

### ROI Analysis

**Current Metrics (baseline):**
- Avg TypeScript CC: 6.1 across source files (peak: 12 in `validateGiftInput.ts`)
- Hotspot change risk: Every API or validation change requires touching `GiftForm.tsx` (mixed concerns)
- Domain layer integrity: 1 upward dependency violation (`RecommendationService` → `validateGiftInput`)
- Rate limiting: Effectively 0% effective under multi-instance serverless deployment
- Interest cost: ~2–4 hrs/sprint in friction (onboarding, layer confusion, per-request GC, missing APM)

**Expected After Full Refactoring:**
- Avg TypeScript CC: ≤ 4 (target reduction: ~35%)
- Hotspot change risk: API/validation changes isolated to their own modules; UI untouched
- Domain layer integrity: Zero upward imports — clean architecture maintained
- Rate limiting: 100% effective under any Vercel scaling topology
- Interest cost: ~0.5–1 hr/sprint (standard PR overhead only)

**Value:**
- **Phase 1 alone** saves ~1.5–3 hrs/sprint in reduced friction = pays back its 8–14 hr investment in 4–8 sprints
- **Phase 2** reduces defect risk on validation changes (CC:12 → ≤4); each new validated field = one object, not a function rewrite
- **Phase 3** removes the single largest security gap (rate limiter) and adds E2E coverage — enabling confident public launch
- **Payback period:** Phase 1 ROI positive within 2 months; Phase 2 within 3 months; Phase 3 is a launch prerequisite (ROI = launch viability)

---

## Referenced Paths

> Drift detection manifest: paths categorized by how much a change would invalidate this document.

### High Relevance

- `GiftSugestionApp/src/components/forms/GiftForm.tsx` - Primary hotspot (score 8.4); RF-1 and Pattern 3 target
- `GiftSugestionApp/src/application/validation/validateGiftInput.ts` - Highest CC (12); RF-2 and Pattern 1 target
- `GiftSugestionApp/src/app/api/gift-suggestions/handler.ts` - RF-4 and Pattern 2 target; concrete dependency coupling
- `GiftSugestionApp/src/domain/services/RecommendationService.ts` - RF-3 target; domain layer violation
- `GiftSugestionApp/src/lib/rateLimiter.ts` - Pattern 4 target; in-memory rate limiter

### Medium Relevance

- `GiftSugestionApp/src/app/api/gift-suggestions/route.ts` - Composition root for Pattern 2 / Factory
- `GiftSugestionApp/src/app/page.tsx` - RF-5 target; health check extraction
- `GiftSugestionApp/src/infrastructure/catalog/CatalogRecommendationProvider.ts` - Concrete provider to be moved to composition root
- `GiftSugestionApp/src/lib/errors.ts` - Error hierarchy; context for RF-3
- `GiftSugestionApp/src/lib/health-handler.ts` - Existing health infrastructure; context for RF-5

### Low Relevance

- `GiftSugestionApp/src/tests/` - Test coverage baseline; safety net for all refactorings
- `GiftSugestionApp/.github/workflows/ci.yml` - CI gate context for safety practices
- `GiftSugestionApp/vitest.config.ts` - Test framework configuration

---

## Metadata

- **Total Refactoring Opportunities:** 9 (5 RF + 4 Pattern applications)
- **Hotspots Identified:** 8
- **Quick Wins:** 5 (Phase 1)
- **Strategic Improvements:** 4 (Phases 2–3)
- **Estimated Total Effort:** 35–62 hours (~5–8 person-days)
- **Phases:** 3
- **Patterns Recommended:** 4 (Strategy, Factory, Facade, Provider Interface)
- **Existing Analysis Used:** Tech Debt Assessment: GiftSugestionApp (12/12 steps)

---

*Generated by Helix Intelligent Modernization Platform*
*Synced into this repo by `aire-helix-sync` on 2026-09-24. Read-only reference — do not edit this file; changes must be made in Helix and re-synced.*

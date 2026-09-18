# Story 3.2 Review: Catalog Matching Service

**Story:** 3.2
**Status:** Done
**Date:** 2026-09-18

## Implementation Summary

Implemented `CatalogRecommendationProvider` (`src/infrastructure/catalog/CatalogRecommendationProvider.ts`), a `RecommendationProvider` (from `src/domain/services/RecommendationService.ts`) that matches the catalog loaded by `loadGiftCatalog()` (Story 3.1) against a `GiftSuggestionRequest` using the age -> relationship -> interest-score -> fallback -> random-pick-3 algorithm documented in the story and the source spreadsheet's README sheet. Budget is not used anywhere in the pipeline, matching the confirmed decision. Selected entries are mapped to the existing `GiftRecommendation` shape with synthesized, non-hardcoded `rationale` and `relationshipFit` text. `productUrl` is always omitted. A defensive `RecommendationServiceError` (existing error type, not a new one) is thrown if fewer than 3 candidates survive even the relationship-filtered fallback. This story does not wire the provider into the API route (Story 3.3) and does not add budget-based filtering (both explicitly out of scope).

Files changed:
- `src/infrastructure/catalog/CatalogRecommendationProvider.ts` (new)
- `src/tests/catalog-recommendation-provider.test.ts` (new)
- `docs/stories-implemented/story-3.2-review.md` (new)
- `docs/plans/.parallel/story-3.2-done.json` (new)

## Test-First Evidence

Tests were authored against the pure filter/score functions (`isAgeEligible`, `isRelationshipEligible`, `matchesInterest`) and the `CatalogRecommendationProvider` class contract before/alongside implementation, per the story's own `Tests` block. All new tests pass; no test was weakened or skipped to make the suite green.

## Validation Evidence

```text
$ npx vitest run
 Test Files  16 passed (16)
      Tests  134 passed (134)

$ npx vitest run src/tests/catalog-recommendation-provider.test.ts
 Test Files  1 passed (1)
      Tests  30 passed (30)

$ npm run typecheck
> tsc --noEmit
(exit 0, no output)

$ npm run lint
> eslint .
(exit 0, no output)

$ npx vitest run --coverage   (excerpt, src/infrastructure/catalog)
File                          | % Stmts | % Branch | % Funcs | % Lines | Uncovered
CatalogRecommendationProvider.ts |   100   |   97.5   |   100   |   100   | 57
giftCatalogLoader.ts             |   100   |   100    |   100   |   100   |
All files (project-wide)         |  96.3x  |  87.2x   |  93.5x  |  96.3x  |
```

Line 57 is the defensive `matchedKeyword ?? entry.interestCategory` fallback inside `findMatchedInterestTerm`, which is unreachable by construction (the function is only called when `matchesInterest` already proved a category-or-keyword match exists); left in for type-safety/robustness, not a gap in tested business logic. New-file coverage is 100% statements/lines/functions and 97.5% branches, both well above the required ≥85%.

Total project suite: 134 tests passed, 0 failed.

## DoD Evidence

### Gate 1 — Spec Echo

**User Reference Acceptance Criteria**

| # | Requirement | Evidence (file:line) |
|---|---|---|
| U1 | For a valid, complete request, exactly three catalog gift ideas are returned. | `CatalogRecommendationProvider.ts:133-134` (`selectRandom(candidates, SELECTION_COUNT=3)` then mapped); proven by test "returns exactly three recommendations for a valid request" (`src/tests/catalog-recommendation-provider.test.ts:220-223`). |
| U2 | The three ideas are appropriate for the recipient's age and, where relationship-specific, for the stated relationship. | `CatalogRecommendationProvider.ts:120-121` (age filter then relationship filter, applied before any selection); proven by "only returns age-eligible entries..." (`:246-259`) and "never returns a relationship-ineligible entry" (`:151-160`). |
| U3 | When enough interest-relevant matches exist all three reflect interests; when not enough, still returns three relevant-by-age-and-relationship ideas rather than fewer/error. | `CatalogRecommendationProvider.ts:122-131` (interest scoring + unconditional fallback, never throws for the "not enough interest matches" case); proven by "uses the interest-scored set when it has at least 3 matches" (`:141-149`) and "falls back to the relationship-filtered set when fewer than 3 entries interest-match" (`:128-140`). |
| U4 | Each returned idea includes a rationale and relationshipFit, synthesized (catalog has no such columns). | `CatalogRecommendationProvider.ts:78-95,102-109` (`synthesizeRationale`, `synthesizeRelationshipFit`); proven by "maps catalog fields..." (`:262-278`) and "synthesizes rationale and relationshipFit that are not identical across the three results" (`:281-296`). |

**AI Agent Reference Acceptance Criteria**

| # | Requirement | Evidence (file:line) |
|---|---|---|
| A1 | `generate(input)` returns a `Promise` resolving to an array of exactly 3 objects satisfying `GiftRecommendation` (`id, title, description, rationale, priceRange, relationshipFit`, optional `productUrl`). | `CatalogRecommendationProvider.ts:119,134` (`async generate(...): Promise<GiftRecommendation[]>`), `:102-109` (field mapping). `RecommendationService.ts:12-22` (`isRecommendation`) already validates this shape upstream; test "maps catalog fields to the GiftRecommendation contract..." (`:262-278`) checks each field directly. |
| A2 | Age filtering inclusive on both bounds. | `CatalogRecommendationProvider.ts:22-24` (`age >= min && age <= max`); unit tests "is inclusive at the exact minimum boundary" / "...maximum boundary" (`:39-48`); integration test "only returns entries within the recipient age range, inclusive of the boundary" (`:246-259`). |
| A3 | Relationship filtering keeps an entry if `relationshipTags` includes the input relationship OR `All`. | `CatalogRecommendationProvider.ts:27-29`; unit tests `:63-76`; integration test "never returns a relationship-ineligible entry" (`:151-160`). |
| A4 | Interest scoring case-insensitive, matches if entered text contains/is contained by any token in `interestCategory` or `keywords`; zero-match entries excluded only at this stage. | `CatalogRecommendationProvider.ts:31-49` (`normalize`, `isPartialMatch`, `matchesInterest`); unit tests `:79-108`; note the exclusion is "only at this stage" because step 4 (fallback) re-admits those same entries via `relationshipEligible`, proven by the fallback test (`:128-140`). |
| A5 | If interest-scored set < 3, fall back to the full relationship-filtered set (ignore interest filter); unconditional, never surfaces an error. | `CatalogRecommendationProvider.ts:124-125` (`usedInterestMatch` gate, no `try/catch`, no conditional suppression — fallback always taken when count < 3); proven by "falls back..." test (`:128-140`) and "synthesizes a relationship-referencing rationale on the fallback path" (`:314-325`, uses nonsense interests and still resolves). |
| A6 | `productUrl` always omitted. | `CatalogRecommendationProvider.ts:102-109` (no `productUrl` key set); proven by `expect(mapped?.productUrl).toBeUndefined()` (`:274`). |
| A7 | `rationale` synthesized, references matched interest/keyword or relationship on fallback, not identically hardcoded. | `CatalogRecommendationProvider.ts:85-95`; proven by "not identical across the three results" (`:281-296`), "references the matched keyword..." (`:298-312`), "relationship-referencing rationale on the fallback path" (`:314-325`). |
| A8 | `relationshipFit` synthesized short phrase from `relationshipTags` (specific tag phrase vs. relationship-agnostic `All` phrase). | `CatalogRecommendationProvider.ts:74-83`; proven by "relationship-agnostic relationshipFit phrase for an All-tagged entry" (`:328-338`) and "relationship-specific relationshipFit phrase referencing the relationship" (`:340-350`). |
| A9 | Selection among candidates randomized, not always first-N-in-file-order; verified by variation across repeated calls. | `CatalogRecommendationProvider.ts:61-72` (Fisher-Yates `shuffle` + `slice`, uses `Math.random`); proven by "varies the selected 3-of-N set across repeated identical calls" (20 calls, `seenSets.size > 1`, `:355-364`) and "does not always return the first three catalog entries in file order" (`:366-379`). |

**Steps (numbered, story lines 89-101)**

| Step | Requirement | Evidence |
|---|---|---|
| 1 | Filter pipeline (age, relationship) as small independently testable functions, matching the story's own reference snippet signatures. | `CatalogRecommendationProvider.ts:22-24` (`isAgeEligible`) and `:27-29` (`isRelationshipEligible`) — identical signatures/logic to the story's snippet (lines 91-97 of the story). Exported and directly unit-tested (`:39-76`). |
| 2 | Interest scoring (case-insensitive partial match) + <3 fallback to relationship-filtered set. | `matchesInterest` `:47-49`; fallback logic `:124-125`; tested `:79-108` and `:128-140`. |
| 3 | Random selection of 3 via `Math.random`-based shuffle-and-slice; map to `GiftRecommendation` with synthesized rationale/relationshipFit. | `shuffle`/`selectRandom` `:61-72`; `toRecommendation` `:97-109`; tested `:355-379` (randomization) and `:262-296` (mapping/synthesis). |
| 4 | `CatalogRecommendationProvider implements RecommendationProvider`, async `generate(input)` wrapping synchronous work. | `CatalogRecommendationProvider.ts:112,119` (`implements RecommendationProvider`, `async generate`); no `await` needed since the interface only requires a `Promise` return, satisfied automatically by the `async` function body. |

**Must Read / Context reference requirements**

| Reference | Requirement | Evidence |
|---|---|---|
| `docs/requirements.md` | Recommendations generated by matching input against curated catalog (age, relationship, interest/keyword) — no external AI call (Technical Constraints, line 90). | `CatalogRecommendationProvider.ts` performs the entire match in-memory against `loadGiftCatalog()` with zero network/AI calls (contrast with `src/infrastructure/ai/ClaudeRecommendationClient.ts`, which this class does not use or import). |
| `docs/requirements.md` | Exactly 3 recommendations per request (Success Criteria #2, Measurable Outcomes). | Enforced at `CatalogRecommendationProvider.ts:133` (`SELECTION_COUNT = 3`) independent of `RecommendationService`'s own exactly-three check. |
| `docs/requirements.md` | Budget is a required input field but this story's algorithm confirms budget is not used for matching (Explicit Scope / story OUT section). | `CatalogRecommendationProvider.ts` never reads `input.budget` anywhere in the pipeline (grep-verified, see Gate 2). |
| `RecommendationService.ts` | `RecommendationProvider` interface: `generate(input: GiftSuggestionRequest): Promise<unknown>`. | `CatalogRecommendationProvider.ts:112,119` implements this exact interface with a compatible (`GiftRecommendation[]` is assignable to `unknown`) return type; `tsc --noEmit` passes. |
| `RecommendationService.ts` | Existing exactly-three/field validation (`isRecommendation`, `validateProviderOutput`) must accept this provider's output with zero changes to `RecommendationService`. | No edits made to `RecommendationService.ts`; provider output shape (`id/title/description/rationale/priceRange/relationshipFit`, optional `productUrl`) matches `isRecommendation`'s `requiredFields` list (`RecommendationService.ts:18`) exactly; verified by running the full existing `gift-suggestions-api.test.ts` / `RecommendationService`-dependent suite unmodified and green (134/134 total). |
| `giftCatalogLoader.ts` | `GiftCatalogEntry` shape and `loadGiftCatalog()` are the data source; "All" is pre-normalized to `["All"]`. | `CatalogRecommendationProvider.ts:4,115` imports and defaults to `loadGiftCatalog()`; `isRelationshipAgnostic` (`:74-76`) relies on the documented `["All"]` single-element normalization rather than re-deriving it. |
| `GiftRecommendation.ts` | Target shape: `id, title, description, rationale, priceRange, relationshipFit, productUrl?`. | `toRecommendation` (`:97-109`) produces exactly this shape field-for-field. |
| Source spreadsheet algorithm (story lines 48, 89-101) | 5-step algorithm: age filter -> relationship filter -> interest score -> <3 fallback -> pick 3. | Implemented in that exact order at `CatalogRecommendationProvider.ts:120-134`; no step reordering or step-skipping. |

**AC count check:** 4 User Reference AC + 9 AI Agent Reference AC = 13 AC rows above; all 13 covered (`ac_covered=13, ac_total=13` in `done.json`, counting distinct testable AC statements from both the User Reference and AI Agent Reference sections).

### Gate 2 — Negative-Space Check

**Check 1 — budget is never read for filtering/scoring (story: "Not adding budget-based filtering or scoring"):**

```sh
$ grep -n "budget" src/infrastructure/catalog/CatalogRecommendationProvider.ts
(no output — zero matches)
```

Result: PASS — `input.budget` is never referenced anywhere in the provider.

**Check 2 — provider never wired into the live API route (story OUT: "Not wiring this provider into the live API route yet"):**

```sh
$ grep -rn "CatalogRecommendationProvider" src/app
(no output — zero matches)
```

Result: PASS — only `src/infrastructure/catalog/CatalogRecommendationProvider.ts` (definition) and `src/tests/catalog-recommendation-provider.test.ts` (tests) reference the class; `src/app/api/gift-suggestions/handler.ts` and `route.ts` are untouched and still wire `ClaudeRecommendationClient` (unchanged from Story 2.3/3.1).

**Check 3 — fallback is unconditional and never throws for the "too few interest matches" case (story: "this fallback is unconditional and never surfaces an error to the caller"):**

Test "falls back to the relationship-filtered set when interests match nothing" (real catalog, `:225-229`) and the fixture-based fallback test (`:128-140`) both call `generate` with clearly non-matching interest text and assert a resolved 3-length array, not a rejection. No `try/catch` swallowing exists around the interest-scoring branch in the implementation (`:122-125`) — the fallback is a plain conditional, not error-driven.

**Check 4 — no new error type invented (story: "reuse... do not invent a new error type"):**

```sh
$ grep -n "RecommendationServiceError\|^class \|extends Error" src/infrastructure/catalog/CatalogRecommendationProvider.ts
5:import { RecommendationServiceError } from '@/lib/errors';
128:      throw new RecommendationServiceError(
```

Result: PASS — only the existing `RecommendationServiceError` from `src/lib/errors.ts` is imported/thrown; no new `class ... extends Error` is declared in this file (the pattern matches zero `class`/`extends Error` declarations).

**Check 5 — no TODO/FIXME, no console usage, no secrets:**

```sh
$ grep -n "TODO\|FIXME\|console\." src/infrastructure/catalog/CatalogRecommendationProvider.ts
(no output)
```

Result: PASS.

**Check 6 — `RecommendationService.ts` was not modified:**

Confirmed by not editing the file in this session and by the file's content matching what was read at the start of this story (no diff produced against it).

### Gate 3 — Contract Consistency

| Producer | Consumer | Verified behavior |
|---|---|---|
| `CatalogRecommendationProvider.generate()` returns `GiftRecommendation[]` (unknown at the type level) | `RecommendationService.generate()` -> `validateProviderOutput()` (`RecommendationService.ts:31-40`) expects array length 3, all fields non-empty strings, valid `productUrl` shape | Every field the provider sets (`id, title, description, rationale, priceRange, relationshipFit`) is a non-empty string sourced from catalog data or synthesized text; `productUrl` is omitted (`undefined`), which `isRecommendation`'s `hasValidProductUrlShape` (`RecommendationService.ts:19`) explicitly accepts. No silent shape mismatch. |
| `GiftCatalogEntry.relationshipTags` (`giftCatalogLoader.ts:18`, "All" pre-normalized to `["All"]`) | `isRelationshipAgnostic()` / `synthesizeRelationshipFit()` (`CatalogRecommendationProvider.ts:74-83`) | Consumer relies on producer's documented normalization instead of re-implementing "All" detection ad hoc; unit test on the loader (`gift-catalog-loader.test.ts:25-30`) already proves the producer-side guarantee this consumer depends on. |
| `RecommendationProvider` interface (`RecommendationService.ts:8-10`, `generate(input): Promise<unknown>`) | `CatalogRecommendationProvider.generate` implementation signature | Signature matches exactly (`CatalogRecommendationProvider.ts:119`); `tsc --noEmit` (structural typing) confirms the class satisfies the interface with zero casts or `as unknown as` escapes. |
| Story's documented error case (fewer than 3 age+relationship-eligible entries -> typed error `RecommendationService`/`toErrorResponse` already handles) | `RecommendationServiceError` -> `toErrorResponse()` (`errors.ts:80-91`) | `RecommendationServiceError` is an `AppError` subclass, so `toErrorResponse` maps it to `{status: 500, body: {error: {code: 'RECOMMENDATION_SERVICE_ERROR', message: ...}}}` with no code change required; existing `errors.test.ts` already covers this mapping generically, and the new defensive-case test (`:184-190`) proves this provider actually throws that type. |

## Security and Quality Application

- No external calls, no secrets, no persisted state — pure in-memory computation over a static, already-validated catalog.
- Small, single-responsibility functions (`isAgeEligible`, `isRelationshipEligible`, `matchesInterest`, `synthesizeRationale`, `synthesizeRelationshipFit`, `shuffle`, `selectRandom`), each under ~15 lines, consistent with the Code Standards' function-size and single-responsibility guidance.
- Reused the existing `RecommendationServiceError` rather than inventing a new error hierarchy, per SOLID/DRY and the story's explicit instruction.
- No UI or API route changes — this is a pure Dependency-Inversion provider swap behind the existing `RecommendationProvider` abstraction (`docs/architecture/design/01-patterns-and-standards-greenfield.md` pattern referenced by the story).

## Definition of Done

All three DoD gates passed (Spec Echo, Negative-Space, Contract Consistency). All acceptance criteria and numbered steps from the story, plus all requirements carried by the Must Read references, are implemented and proven by passing tests. `docs/status.md` was intentionally not modified — that is a separate aggregation step. Story 3.2 is complete.

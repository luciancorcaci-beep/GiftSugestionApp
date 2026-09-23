# Test Plan - Story 4.1: Expanded Relationship Options

## Scope

**Coverage**: Story 4.1 — Expanded Relationship Options (Epic 4)
**In Scope**:
- The `RELATIONSHIPS` domain constant (6 → 12 values)
- The Relationship dropdown in `GiftForm.tsx` (now sourced from `RELATIONSHIPS` instead of a hardcoded duplicate)
- `POST /api/gift-suggestions` request validation for all 12 relationship values
- `CatalogRecommendationProvider` matching behavior for the 6 new relationship values against the real (162-entry) catalog
- Regression of the original 6 relationship values (no behavior change)
- The updated `src/data/giftCatalog.json` data source (150 → 162 entries, additive)

**Out of Scope** (per the story's OUT-of-scope + requirements v1.2):
- Any UI/visual redesign beyond the widened option list
- Authentication/authorization (none exists in this system)
- Localization/i18n of relationship labels
- Curating further catalog content beyond what `Gift_Ideas_Database-V1.xlsx` already provides
- The unrelated, pre-existing `next@13.5.11` CVE blocker and `ConcurrencyLimiter` dead code (tracked separately in `docs/status.md`)

---

## Requirements Traceability

Requirement IDs below map to `docs/requirements.md` v1.2's amended Success Criteria / Quality Gates / Technical Constraints (all under the "2026-09-22"/"2026-09-23" amendment markers) and the story's Acceptance Criteria (`docs/plans/stories/epic-4-story-4.1-expanded-relationship-options.md`).

| Requirement ID | Description | Test Scenarios |
|----------------|-------------|------------------|
| REQ-1 | Relationship dropdown shows 12 options in canonical order | TC-001 |
| REQ-2 | Selecting any of the 6 new options + valid inputs → exactly 3 recommendations | TC-002, TC-003, TC-004 |
| REQ-3 | Original 6 relationship values show no regression | TC-005, TC-006 |
| REQ-4 | Unsupported relationship value → 400 listing all 12 canonical values | TC-007, TC-008 |
| REQ-5 | No catalog data change was required *by this story's code* — but the data source itself was updated to 162 entries (12 dedicated to the new relationships), reconciled in requirements v1.2 | TC-009, TC-010 |
| REQ-6 | Single canonical source — no duplicate relationship list survives anywhere in `src/` | TC-011 |
| REQ-7 | Coverage ≥85% project-wide, no regression from the 96.47% baseline | TC-012 |
| REQ-8 | Live (non-unit-test) verification against a real running server | TC-013, TC-014 |

**Coverage Summary**: 8/8 requirements mapped, 14 scenarios, 0 gaps identified.

---

## Test Categories

### Unit Tests
- `RELATIONSHIPS` shape and length (`src/domain/entities/GiftRecommendation.ts`)
- `validateGiftInput` acceptance/rejection for all 12 values (`src/tests/gift-input-validation.test.ts`)
- `GiftForm` dropdown rendering (`src/tests/gift-form.test.tsx`)
- `CatalogRecommendationProvider.generate()` for each new relationship value (`src/tests/catalog-recommendation-provider.test.ts`)
- `loadGiftCatalog()` entry count and shape (`src/tests/gift-catalog-loader.test.ts`)

### Integration Tests
- `POST /api/gift-suggestions` end-to-end through the real handler + real default `CatalogRecommendationProvider` (`src/tests/gift-suggestions-api.test.ts`)

### E2E / Live Verification
- Real `next build && next start` + `curl` against a running server (manual, QA-executed independently of DEV's own prior live check)

---

## Test Scenarios

| ID | Category | Scenario | Expected Result | Priority |
|----|----------|----------|-------------------|----------|
| TC-001 | Unit | `GiftForm` renders all 12 relationship options in canonical order | 12 `<option>` elements, text matches `RELATIONSHIPS` exactly, in order | High |
| TC-002 | Unit | `validateGiftInput` accepts each of the 6 new relationship values | No exception thrown for any of the 6 | High |
| TC-003 | Unit | `CatalogRecommendationProvider.generate()` returns exactly 3 recommendations for each of the 6 new relationship values (real catalog) | `result.length === 3` for all 6 | High |
| TC-004 | Integration | `POST /api/gift-suggestions` with a new relationship value, valid age/budget/interests | `200` + `recommendations.length === 3` | High |
| TC-005 | Unit | `validateGiftInput` still accepts all 6 original relationship values | No exception thrown (regression) | High |
| TC-006 | Unit | Original-6-relationship catalog matching tests (age/relationship filters) still pass unchanged | All pre-existing assertions pass | High |
| TC-007 | Unit | `validateGiftInput` rejects an unsupported relationship (e.g. `"Coworker"`) | `ValidationError` with message listing all 12 canonical values, in order | High |
| TC-008 | Integration | `POST /api/gift-suggestions` with an unsupported relationship | `400`, `error.code === 'VALIDATION_ERROR'`, message lists all 12 | High |
| TC-009 | Unit | `loadGiftCatalog()` returns exactly 162 entries | `length === 162` | High |
| TC-010 | Manual/Data | Original 150 catalog entries are byte-identical; 12 new entries are dedicated-tagged for the 6 new relationships | `git diff` shows additive-only change; tag distribution matches `{Frenemy:5, Coworker I Tolerate:5, Boss I Need to Impress:4, Mortal Enemy:3, Secret Santa Victim:3, Person Whose Name I Forgot:3}` | Medium |
| TC-011 | Manual/Grep | No file outside `GiftRecommendation.ts` and test files hardcodes a relationship list | `grep -rln "'Friend'" src/ \| grep -v GiftRecommendation.ts \| grep -v /tests/` → empty | Medium |
| TC-012 | Coverage | Full suite coverage ≥85%, no regression from 96.47% baseline | `node scripts/check-coverage.mjs` → PASS on all 4 metrics | High |
| TC-013 | E2E (live) | Real server: new relationship value → success | `curl` returns `200` + 3 recommendations | High |
| TC-014 | E2E (live) | Real server: invalid relationship → error | `curl` returns `400` with message listing all 12 values | High |

---

## Test Data Requirements

- **Valid data**: age 18–80 (in-range for most catalog entries), budget any positive number (unused in matching, but must pass validation), interests a short free-text string, relationship = each of the 12 canonical values in turn
- **Invalid data**: relationship = `"Coworker"` (a plausible-but-unsupported near-miss, already used in the existing test suite), relationship = missing/undefined
- **Edge data**: an interests string engineered to match nothing (`"nomatch-xyz-check-all-fallback"`), to force reliance on the relationship-filtered fallback set rather than interest-scored matches — this is the scenario most likely to expose an insufficient-candidates bug if the catalog were ever under-provisioned for a given relationship
- **Environment setup**: no `.env` secrets required (this app has zero required production secrets); `TRUSTED_PRODUCT_DOMAINS` may be left at its default (`amazon.com`)

---

## Coverage Goals

- Unit test coverage target: ≥85% (project standard; current baseline 96.48% post-remediation)
- Integration test coverage: 100% of the new/modified request-response paths (new relationship success, invalid relationship rejection) — both already covered by DEV's own added tests, to be independently re-verified by QA
- E2E coverage: at least one live-server round trip per success/failure branch (TC-013, TC-014) — QA runs this independently rather than trusting DEV's own prior live check

## Quality Gates

- Unit test coverage: ≥85%
- Integration tests: 100% passing
- No critical/high severity bugs
- No duplicate relationship list anywhere in `src/` (project-specific gate, per `docs/architecture/design/03-patterns-and-standards-brownfield.md` §7)
- Original 150 catalog entries confirmed unmodified (project-specific gate, given the mid-implementation data-source change)

## Schedule

- Test planning: 2026-09-23
- Test execution: 2026-09-23
- Results reporting: 2026-09-23

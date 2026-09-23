# Patterns & Standards - What Gift Should I Choose

**Date**: 2026-09-22
**Author**: ARCHITECT
**Status**: Approved
**Version**: 1.0
**Based On**:
- `docs/architecture/current/00-system-overview.md`
- `docs/architecture/current/01-full-system-deep-dive.md`
- `docs/architecture/design/02-target-architecture-brownfield.md`
- `SPEC/rulebooks/aire-design-patterns.md`

---

## Pattern Adoption Summary

| Pattern | Decision | Migration Required |
|---------|----------|---------------------|
| Error Handling | [Current — kept] | No |
| Logging | [Current — kept] | No |
| Database Access | N/A — no database in this system | No |
| API Response Format | [Current — kept] | No |
| Configuration Management | [Current — kept] | No |
| Naming Conventions | [Current — kept] | No |
| Code Organisation | [Current — kept] | No |
| UI Components / Shared Library | [New adoption] — consolidate `RELATIONSHIPS` to a single canonical source | Yes — Low effort, scoped entirely to this change |

---

## Known Tech Debt — Shared Code

| Finding | File | Should be replaced with | Status |
|---------|------|---------------------------|--------|
| Hardcoded duplicate of `RELATIONSHIPS` | `src/components/forms/GiftForm.tsx` | `import { RELATIONSHIPS } from '@/domain/entities/GiftRecommendation'` | **Fixed as part of this change** (see UI Components / Shared Library pattern below) |
| Orphaned `ConcurrencyLimiter` class (no call sites) | `src/lib/rateLimiter.ts` | Delete, or repurpose if concurrency limiting becomes needed again | Tracked in `docs/status.md` Upcoming — **not** in scope for this change (no call sites means no behavior risk from leaving it; removing it is a separate, unrelated cleanup) |

No other duplicate components, hooks, or utilities found across `src/components/`, `src/lib/`, or `src/infrastructure/`.

---

## 1. Project Structure

**Decision**: [Current — kept], no additions needed.

```
src/
├── app/                    # Next.js App Router: pages, API routes, middleware
│   ├── api/{gift-suggestions,health}/
│   ├── layout.tsx, page.tsx
├── components/             # Presentation
│   ├── forms/, results/    # Feature-specific
│   └── shared/             # Reused across features (Button, Card, Input, Select)
├── application/            # DTOs + validation (orchestration inputs)
├── domain/                 # Entities + domain services (pure logic)
├── infrastructure/         # Concrete implementations of domain interfaces (catalog provider)
├── lib/                    # Cross-cutting: errors, logger, rate limiter, request body, product URL
├── data/                   # Static bundled data (giftCatalog.json)
└── tests/                  # All test files, colocated in one folder (not beside sources)
```

This change touches only existing folders — no new directories needed. File naming stays as-is (see Naming Conventions below).

---

## 2. Error Handling Pattern

**Decision**: [Current — kept]

- Error types: `AppError` base class + typed subclasses (`ValidationError`, `RecommendationServiceError`, `RecommendationProviderError`, `TooManyRequestsError`, `PayloadTooLargeError`), each carrying `statusCode` + `code`.
- Response format: `{ error: { code, message } }`, mapped once via `toErrorResponse()`.
- Try/catch: one outer catch per HTTP handler; no scattered try/catch inside domain/application logic.
- Logging: every caught error is logged with `code` + relevant context before the mapped response is returned.

This change introduces **no new error paths** — `ValidationError` already covers "relationship not in the accepted set" and needs no code change; only its message text (derived from `RELATIONSHIPS.join(', ')`) grows to list 12 values instead of 6.

### DO
```typescript
// Throw a typed AppError subclass; let the single boundary map it
throw new ValidationError(RELATIONSHIP_MESSAGE);
// ...
} catch (error) {
  const response = toErrorResponse(error);
  return NextResponse.json(response.body, { status: response.status });
}
```

### DON'T
```typescript
// Don't throw/catch raw Error or build ad-hoc response shapes per route
throw new Error('bad relationship');
return NextResponse.json({ message: 'bad relationship' }, { status: 400 }); // inconsistent shape
```

---

## 3. Logging Pattern

**Decision**: [Current — kept]

- Structured JSON to stdout via the single `Logger` interface (`createLogger`).
- Context object first, message second.
- Sensitive keys (`password|secret|token|api[-_]?key|authorization|cookie`) auto-redacted — callers don't need to remember to scrub anything.
- `handler.ts` already logs `{ requestId, relationship, budget }` generically — this automatically covers the 6 new relationship values with **zero code change**.

### DO
```typescript
logger.info({ requestId, relationship: input.relationship, budget: input.budget }, 'Gift recommendations requested');
```

### DON'T
```typescript
logger.info(`Requested for ${input.relationship}, budget ${input.budget}`); // unstructured, harder to query/redact
```

---

## 4. Database Access Pattern

**N/A** — this system has no database. Data access is entirely a static, build-time-bundled JSON import (`src/data/giftCatalog.json` via `giftCatalogLoader.ts`). No connection management, transactions, or query patterns apply. This change adds no catalog data (per the target architecture's explicit decision to rely on the existing 75 `"All"`-tagged entries).

---

## 5. API Design Pattern

**Decision**: [Current — kept]

- Request validation: allowlist-based (`validateGiftInput` rejects unknown fields, bounds-checks values).
- Response format: `{ recommendations: [...] }` (exactly 3) or `{ status: 'ok' }` for health; failures always `{ error: { code, message } }`.
- No authentication layer exists (single-actor system, per `docs/requirements.md`'s Roles & Permissions Matrix) — unaffected by this change.
- Output re-validated at the domain boundary (`RecommendationService` checks the provider's output shape) — infrastructure is never blindly trusted.

### DO
```typescript
// Application-layer validation derives its accepted set from the single domain source
if (typeof value !== 'string' || !RELATIONSHIPS.includes(value as Relationship)) {
  throw new ValidationError(RELATIONSHIP_MESSAGE);
}
```

### DON'T
```typescript
// Don't hardcode a second copy of the accepted values anywhere else in the stack
if (!['Friend', 'Partner', 'Parent', 'Child', 'Sibling', 'Colleague'].includes(value)) { ... }
```

---

## 6. Configuration Pattern

**Decision**: [Current — kept]

- One optional env var (`TRUSTED_PRODUCT_DOMAINS`), sane default (`amazon.com`) if unset.
- No secrets required in this system.
- No config file structure needed beyond `.env.example` documenting the one variable.

This change requires **no new configuration** — the relationship list is a compile-time constant, not an environment-configurable value (correctly so: it's a fixed domain concept, not deployment-specific).

---

## 7. UI Components / Shared Library Pattern

**Decision**: [New adoption] — consolidate to a single canonical source.

**Migration Note**: `GiftForm.tsx` currently hardcodes its own `relationships` array (lines 13 & 141) that duplicates `RELATIONSHIPS` from `src/domain/entities/GiftRecommendation.ts`. As part of this change, `GiftForm.tsx` must import `RELATIONSHIPS` directly instead of maintaining a parallel copy. This is the only migration required by this patterns document, and it is already scoped as part of implementing the relationship-options feature — no separate follow-up work item needed.

Existing shared component organization (`src/components/shared/{Button,Card,Input,Select}.tsx`) is correct and unaffected: these remain the only components imported by both `GiftForm` and `GiftResults`, and no new shared component is needed for this change.

### DO
```typescript
// GiftForm.tsx — target state
import { RELATIONSHIPS } from '@/domain/entities/GiftRecommendation';
// ...
<Select
  options={RELATIONSHIPS.map((relationship) => ({ label: relationship, value: relationship }))}
  ...
/>
```

### DON'T
```typescript
// GiftForm.tsx — current state (to be removed)
const relationships = ['Friend', 'Partner', 'Parent', 'Child', 'Sibling', 'Colleague'] as const;
```

---

## 8. Testing Patterns

**Decision**: [Current — kept]

### Unit / Component Tests
- Location: `src/tests/*.test.ts(x)` (colocated in one folder, not beside sources).
- Naming: `[feature-or-concern].test.ts(x)` (e.g. `gift-input-validation.test.ts`, `gift-form-interactions.test.tsx`).
- Structure: implicit Arrange/Act/Assert within each `it(...)` block.
- Mocking strategy: **dependency injection over module mocking** — construct the unit under test with explicit fake collaborators (a fake `RecommendationProvider`, a dedicated `FixedWindowRateLimiter` instance) rather than `vi.mock()`-ing modules.

### DO
```typescript
// Inject a fake provider directly — no module mocking needed
const provider = { generate: vi.fn().mockResolvedValue(recommendations()) };
const service = new RecommendationService(provider);
await expect(service.generate(validInput)).resolves.toHaveLength(3);
```

### DON'T
```typescript
vi.mock('@/infrastructure/catalog/CatalogRecommendationProvider'); // module-level mock, harder to reason about
```

### Integration Tests
- `src/tests/gift-suggestions-api.test.ts` exercises the full `route.ts` → `handler.ts` → `RecommendationService` → provider chain using real `Request`/`Response` objects, only substituting the provider and rate limiter via the handler's dependency-injection parameters.
- No database to seed/clean up. No external service mocking needed (none exist).

### Coverage Requirements for this change
- Minimum: 85% (project standard; current baseline is 96.47%).
- New/modified code (the `RELATIONSHIPS` constant and `GiftForm.tsx`'s import) must be exercised by tests — add cases asserting: (1) the dropdown renders all 12 options, (2) `validateGiftInput` accepts all 6 new values, (3) `CatalogRecommendationProvider.generate()` still returns exactly 3 recommendations for each new relationship value across a range of ages.
- What to skip: generated files (`giftCatalog.json` itself — already covered by `gift-catalog-loader.test.ts`'s existing assertions, no new coverage needed since its shape doesn't change).
- Enforcement: existing CI gate (`scripts/check-coverage.mjs`) — unchanged, applies automatically.

---

## 9. Documentation Standards

**Decision**: [Current — kept]

- Code comments: only for non-obvious *why* (e.g. the existing comment on `defaultResolveClientKey` explaining the `x-real-ip` vs `X-Forwarded-For` trust distinction). No comments restating *what* the code does.
- No JSDoc/TSDoc block required for simple, self-explanatory functions; used sparingly on `CatalogRecommendationProvider.ts` to document the matching algorithm's *source* (the spreadsheet's documented logic) — a non-obvious provenance fact, not a restatement of the code.
- No README needed for this change — it doesn't add a new module.
- API documentation: none exists formally (no OpenAPI spec in this repo); the `docs/architecture/current/01-full-system-deep-dive.md` Entry Points table is the closest equivalent and needs no update (no new endpoints, no changed request/response shape beyond the enum widening already documented in the target architecture).

---

## File/Module Boundary Map (for this change set)

| Concern | Owning file(s) | New or existing |
|---------|------------------|-------------------|
| Canonical relationship list | `src/domain/entities/GiftRecommendation.ts` | Existing — modified |
| Relationship dropdown UI | `src/components/forms/GiftForm.tsx` | Existing — modified |
| Input validation (consumes canonical list, no change needed) | `src/application/validation/validateGiftInput.ts` | Existing — unchanged |
| Catalog matching (relationship-agnostic, no change needed) | `src/infrastructure/catalog/CatalogRecommendationProvider.ts` | Existing — unchanged |
| Tests | `src/tests/gift-form.test.tsx`, `gift-form-interactions.test.tsx`, `gift-input-validation.test.ts`, `catalog-recommendation-provider.test.ts`, `gift-suggestions-api.test.ts` | Existing — modified (new test cases added) |

**Shared/cross-concern files**: none. This change touches no root config, no central route registry, no app bootstrap, no migrations, no DI/IoC container, no feature-flag registry, and no lockfiles. The two modified files (`GiftRecommendation.ts`, `GiftForm.tsx`) each own exactly one concern and are not touched by any other concurrent concern in this change set — there is nothing for `docs/plans/dependency-graph.yml`'s `shared_files` list to record for this work.

---

## Quality Checklist

- [ ] All new/modified code follows the patterns documented here (no new hardcoded relationship lists anywhere)
- [ ] DO / DON'T examples reviewed
- [ ] Tests follow the documented DI-over-module-mocking pattern
- [ ] Coverage meets 85% minimum (baseline: 96.47%)
- [ ] Code review checked against this document, specifically: no reintroduction of a duplicate relationship list
- [ ] Migration completed for the one [New adoption] pattern: `GiftForm.tsx` imports `RELATIONSHIPS` instead of hardcoding it

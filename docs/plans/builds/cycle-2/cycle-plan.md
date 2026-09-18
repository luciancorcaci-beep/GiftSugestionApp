# Cycle Plan - Recommendation Engine

**Cycle ID**: cycle-2
**BUILDID**: CYCLE-2
**Expected Outcome**: A complete MVP where a buyer submits recipient details and receives exactly three tailored gift recommendations.

---

## Scope

### In Scope (this cycle)

- Validation and recommendation domain model - Epic 2, Story 2.1
- Claude recommendation API and provider adapter - Epic 2, Story 2.2
- Gift form submission and results experience - Epic 2, Story 2.3
- Inline validation, hybrid loading, safe provider errors, retry behavior, and responsive three-card results

### Deferred to Next Cycle

- Authentication and user accounts
- Marketplace checkout or payment processing
- Persistent recommendation history
- Advanced analytics, tuning, and multilingual support

## Workshop Plan (4 half-days)

**Day 1**: Typed request contract, relationship enum, server-side validation, and domain model
→ Goal: production-ready validation path that blocks malformed requests before provider calls

**Day 2**: Claude adapter, recommendation service, exact-three result enforcement, and safe provider failures
→ Goal: production-ready API returning a stable recommendation payload

**Day 3**: Form submission, loading/error states, and recommendation card rendering
→ Goal: production-ready browser flow from valid inputs to three visible suggestions

**Day 4**: End-to-end testing, accessibility checks, responsive review, provider failure rehearsal, and stakeholder sign-off
→ Goal: complete MVP integrated, tested, and demo-ready

Each day ends with production-ready, deployable code - no partial or broken states overnight.

## Acceptance Criteria

- Valid age, budget, relationship, and interests produce exactly three recommendations.
- Relationship selection supports Friend, Partner, Parent, Child, Sibling, and Colleague.
- Invalid or partial input is rejected with inline, user-safe errors and no provider call.
- Loading state is visible while generation is in progress; repeated submit is prevented.
- Provider failure preserves entered values and offers retry without exposing secrets or internals.
- Results are responsive and each card includes title, description, rationale, price range, and optional purchase link.
- Unit and integration tests pass with at least 85% coverage for the recommendation flow.

## Open Items

| Item | Owner |
|------|-------|
| Configure Claude API key through server-side environment variables | DEV |
| Confirm product-link source or use optional links for MVP | PRODUCT_OWNER |
| Validate provider output schema against representative responses | QA |

## Prerequisites

- CYCLE-1 complete and walking skeleton demonstrated.
- Approved requirements, architecture, patterns, and UI/UX specification.
- Claude provider credentials available through a secure local environment configuration.

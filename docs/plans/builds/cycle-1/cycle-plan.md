# Cycle Plan - Foundation

**Cycle ID**: cycle-1
**BUILDID**: CYCLE-1
**Expected Outcome**: A deployable walking skeleton with a browser page, backend health endpoint, and verified frontend-to-backend connection.

---

## Scope

### In Scope (this cycle)

- Backend API skeleton and health endpoint - Epic 1, Story 1.1
- Frontend shell and gift form skeleton - Epic 1, Story 1.2
- Frontend/backend integration and connection status - Epic 1, Story 1.3
- Shared error handling, logging, and UI primitive foundations

### Deferred to Next Cycle

- Structured input validation and recommendation domain model
- Claude provider adapter and recommendation API
- Final recommendation cards, loading states, retry behavior, and end-to-end gift flow

## Workshop Plan (4 half-days)

**Day 1**: Project bootstrap, backend route, and structured error/logging foundation
→ Goal: production-ready backend health endpoint and local startup path

**Day 2**: Next.js shell, responsive entry layout, and shared form primitives
→ Goal: production-ready browser page with the required gift input fields

**Day 3**: Frontend/backend health integration and connection-state handling
→ Goal: production-ready walking skeleton showing backend availability

**Day 4**: Integration testing, accessibility smoke checks, stakeholder review, and scope sign-off
→ Goal: all foundation stories integrated, tested, and demo-ready

Each day ends with production-ready, deployable code - no partial or broken states overnight.

## Acceptance Criteria

- Backend starts locally and `GET /api/health` returns `200` with a JSON status payload.
- Homepage renders a responsive form shell with age, budget, relationship, and interests fields.
- Homepage calls the health endpoint and displays connected or unavailable state without crashing.
- Shared UI primitives follow the approved UI/UX specification.
- Foundation tests pass with no lint errors or browser console errors.

## Open Items

| Item | Owner |
|------|-------|
| Confirm local Next.js/Node project bootstrap during Story 1.1 | DEV |
| Select the final Claude SDK version before Cycle 2 | DEV |

## Prerequisites

- Approved requirements, architecture, patterns, and UI/UX specification.
- No external credentials required for the health-check walking skeleton.

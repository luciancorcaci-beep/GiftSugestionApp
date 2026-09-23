# Requirements - What Gift Should I Choose

**Date**: 2026-09-23 (amended)  
**Author**: ANALYST_PM_GREENFIELD (original), ANALYST_PM_BROWNFIELD (2026-09-22 amendment), ARCHITECT (2026-09-23 reconciliation)  
**Status**: Approved  
**Version**: 1.2

---

## Project Overview

### Vision
Build a web application that helps a person choose a gift for someone by asking for the recipient's age, budget, relationship, and interests. The app then suggests three suitable gift ideas, each tailored to the information entered by the user.

### Problem Statement
People often struggle to decide what to buy for friends, family, or colleagues. The process usually involves searching many sites, comparing ideas, and guessing based on limited information. This application reduces decision fatigue by translating a few key facts into tailored gift recommendations.

### Target Users
- Primary user: a buyer looking for a gift recommendation
- User needs: quick suggestions, relevant recommendations, credible product options, and minimal effort

### Business Value
- Saves time for gift shoppers
- Improves recommendation quality by using structured user inputs
- Increases conversion potential through relevant product links
- Makes the gift-picking process easier and less stressful

---

## Roles & Permissions Matrix

> Canonical source of truth for all personas/roles. This system has a single primary user role for the web experience and no role hierarchy beyond the standard buyer flow.

| Role (canonical) | Description | Key Permissions (allow) | Explicitly Denied | Auth Source |
|------------------|-------------|-------------------------|-------------------|-------------|
| Buyer | Individual using the app to get gift ideas | `gift:generate`, `gift:view`, `purchase:explore` | admin configuration, system maintenance, user management | No role variation — single actor |
| System/Service | AI-assisted recommendation provider and product search integration | `recommendation:generate`, `product:lookup` | no UI access, no direct buyer data modifications | service token |

**Permission keys**:
`gift:generate`, `gift:view`, `purchase:explore`, `recommendation:generate`, `product:lookup`

**Notes**: This is a single-actor system from the end-user perspective. There is no multi-user RBAC requirement in the current scope. Any account or authentication layer would be optional and not required for the MVP.

---

## Project Type

| Attribute | Value |
|-----------|-------|
| Type | Greenfield - New System |
| Quality Level | MVP |
| Timeline | 2-4 weeks |
| Delivery Style | Web application |
| User Facing | Yes |

---

## Success Criteria

1. The user can enter the recipient's age, budget, relationship, and interests in a simple form.
2. The application produces exactly three suitable gift recommendations based on the submitted details.
3. Each recommendation is understandable and clearly tied to the user-provided context.
4. The app responds quickly enough for a clear interactive user experience.
5. The recommendations are relevant and usable without requiring the user to refine the prompt repeatedly.
6. Relationship options include 12 values: Friend, Partner, Parent, Child, Sibling, Colleague, Mortal Enemy, Frenemy, Coworker I Tolerate, Secret Santa Victim, Boss I Need to Impress, Person Whose Name I Forgot. _(Amended 2026-09-22 — added 6 humorous relationship options to the original 6.)_

### Measurable Outcomes
- Exactly 3 recommendations are generated for each request.
- Recommendations are based on the required structured inputs: age, budget, relationship, and interests.
- Relationship selection supports the full required list of 12 values (see above), sourced from a single canonical list shared by validation and the UI dropdown.
- Selecting any of the 6 new relationship values and submitting a valid request still returns exactly 3 recommendations (no regression). _(Reconciled 2026-09-23)_ This is now backed by two overlapping guarantees rather than one: the 75 relationship-agnostic ("All") entries out of the original 150 still provide a fallback for any relationship value, **and** the catalog (now 162 entries, via `Gift_Ideas_Database-V1.xlsx`) additionally includes 12 entries specifically tagged for the 6 new relationships — see the amended Technical Constraints below.
- The app can be used from a browser without additional installation or setup.

---

## Failure Criteria

The project will be considered unsuccessful if any of the following occurs:

- The app produces no useful recommendations or not exactly 3 suggestions.
- Recommendations are generic, unrelated, or clearly ignore the entered age, budget, relationship, or interests.
- The form does not support the required relationship options (all 12, including the 6 added 2026-09-22).
- The relationship list diverges between the UI and backend validation (i.e., the two are not sourced from one canonical list).
- The app takes too long to provide meaningful output for a normal user interaction.
- The application requires complex setup or external dependencies in a way that prevents normal use.

---

## Technical Constraints

- The solution is a web app accessible via browser.
- Recommendations are generated by matching user input against a curated gift-idea catalog (age range, relationship tags, and interest/keyword matching) — no external AI call.
- Product links should be surfaced using Amazon-style purchase sourcing when applicable.
- The delivery should remain lightweight and suitable for an MVP.
- No hard security or multi-user authorization constraints are required for the initial version.
- The product should work without requiring advanced infrastructure or enterprise systems.
- _(Amended 2026-09-22)_ The relationship option list must have a single canonical source (`RELATIONSHIPS` in `src/domain/entities/GiftRecommendation.ts`) consumed by both backend validation and the UI dropdown — `GiftForm.tsx` currently hardcodes a duplicate array, which must be replaced with an import from the canonical list as part of this change to prevent the two lists from drifting apart.
- _(Amended 2026-09-22; superseded 2026-09-23)_ ~~No gift catalog data changes are required for the new relationship options — they rely on the 75 existing `"All"`-tagged catalog entries for relationship-eligible matches; no new catalog entries or relationship tags are added as part of this change.~~ **Superseded**: an updated source spreadsheet (`Gift_Ideas_Database-V1.xlsx`) was supplied before implementation, adding 12 dedicated entries tagged for the 6 new relationships (162 entries total, up from 150 — the original 150 are byte-identical/unchanged). This is a strict improvement (dedicated coverage in addition to the `"All"`-tag fallback, not instead of it) and required no code change beyond regenerating `src/data/giftCatalog.json` via `scripts/convert-gift-catalog.py` (which was also fixed to support the new file's shared-strings XLSX format). See `docs/stories-implemented/story-4.1-review.md` (Deviations) and `docs/reviews/story-4.1-code-review-v1.md`.

---

## Quality Gates

- Core user flow must generate exactly 3 relevant gift suggestions.
- Recommendations must be based on user input rather than random output.
- The form must include fields for recipient age, budget, relationship, and interests.
- Relationship options must include all 12 values: Friend, Partner, Parent, Child, Sibling, Colleague, Mortal Enemy, Frenemy, Coworker I Tolerate, Secret Santa Victim, Boss I Need to Impress, Person Whose Name I Forgot.
- The app should have handling for empty or partial user input without crashing.
- Basic test coverage should exist for the recommendation generation and input validation paths, including the 6 newly added relationship values (validation acceptance + catalog matching still returns exactly 3 recommendations).

---

## Explicit Scope

### In Scope
- User enters the recipient's age
- User enters the budget for the gift
- User selects the relationship type from the required list (12 values, see Success Criteria)
- User provides a text box for interests or preferences
- Application generates exactly three suitable gift suggestions
- Recommendations are selected from a curated gift-idea catalog by matching age, relationship, and interests
- Basic browser-based UI for an MVP
- Simple validation and reload-safe interaction
- _(Amended 2026-09-22)_ Add 6 new relationship options (Mortal Enemy, Frenemy, Coworker I Tolerate, Secret Santa Victim, Boss I Need to Impress, Person Whose Name I Forgot) to the canonical `RELATIONSHIPS` list, backend validation, and the UI dropdown
- _(Amended 2026-09-22)_ Fix `GiftForm.tsx`'s hardcoded, duplicated relationship array to instead import from the canonical `RELATIONSHIPS` source, so the UI and backend can never drift apart again

### Out of Scope
- Full user authentication or account system
- Multi-user administration or role management
- Marketplace checkout and payment processing
- CRM or inventory integration
- Advanced analytics dashboards
- Custom recommendation tuning beyond the MVP flow
- Multi-language support beyond the initial implementation
- _(Amended 2026-09-22; superseded 2026-09-23 — see Technical Constraints)_ ~~Curating or adding gift catalog entries/relationship tags specific to the 6 new relationship options — they rely entirely on the existing 75 `"All"`-tagged catalog entries~~. **This was subsequently done anyway**, via a user-supplied updated spreadsheet (`Gift_Ideas_Database-V1.xlsx`), before implementation began — no story work targeted the catalog directly.
- _(Amended 2026-09-22)_ Reordering or renaming the existing 6 relationship options

### Scope Boundary
This project is limited to the gift suggestion experience only. It is not a marketplace, not a user management platform, and not a full commerce system.

---

## Timeline and Milestones

| Milestone | Target |
|-----------|--------|
| Requirements approval | 2026-09-16 |
| UI and flow definition | Next sprint |
| MVP implementation | Following milestone |
| Validation and polish | Prior to release |

---

## Assumptions

- The user enters enough details to form a reasonable recommendation using age, budget, relationship, and interests.
- The recommendation engine can generate useful outcomes without a highly complex decision model.
- The app is intended for a single-user, low-friction web experience.
- Relationship values are limited to the required set of 12: Friend, Partner, Parent, Child, Sibling, Colleague, Mortal Enemy, Frenemy, Coworker I Tolerate, Secret Santa Victim, Boss I Need to Impress, Person Whose Name I Forgot. _(Amended 2026-09-22)_
- The 6 new relationship values are humorous/informal in tone by design (per user request) — no gift-catalog curation is assumed to distinguish "sincerity" of relationship when matching.

---

## Open Questions / Clarifications

None at this time. The requirements are sufficiently defined for the MVP stage.

---

## Approval

This document reflects the agreed MVP scope and direction for the application.

---
BUILDID: CYCLE-1
Epic: 1 — FOUNDATION
ID: 1.2b
Parent-Story: 1.2
Date: 2026-09-25
Jira: LOCAL
GitHub: LOCAL
AzureDevOps: LOCAL
Enhancement: ENHANCEMENT-2
Related-Story: 1.2
---

# Epic 1 / Story 1.2b — Change the Page Background to a Pleasant Light Blue

> ⚡ Enhancement sub-story of Story 1.2. See parent story for full epic context.

## Objective

Change the page background's `--surface` CSS custom property in `src/app/globals.css` from `#faf0dc` (the cream set by Enhancement 1 / Story 1.2a) to a soft sky blue (`#e0f2fe`), which harmonizes with the app's existing teal primary color. No other colors, components, or behavior change.

## Acceptance Criteria

- [ ] `--surface` in `src/app/globals.css` is updated from `#faf0dc` to `#e0f2fe`
- [ ] The page body visibly renders the new light blue tone when loaded in a browser
- [ ] No other colors (text, buttons, cards, borders, accent) are changed
- [ ] Text remains clearly legible against the new background (no contrast regression)
- [ ] All affected tests pass
- [ ] No regression in adjacent functionality

## Must Read (References)

- docs/enhancements/enhancement-2.md (Unified Request & Impact Report)
- docs/plans/stories/epic-1-story-1.2-frontend-shell.md (parent story)
- docs/plans/stories/enhancement-epic-1-story-1.2a-deepen-page-background-cream-tone.md (prior sibling enhancement on the same variable)

## Prerequisites

- Working code checkout
- Parent story 1.2 implementation complete (it is — Epic 1 is done)
- Existing tests pass on baseline

## Implementation Steps

1. In `src/app/globals.css`, change `--surface: #faf0dc;` to `--surface: #e0f2fe;` (line 5).
2. Run `npm run build && npm run start` (or `npm run dev`) and visually confirm the page background renders the new light blue tone and text remains legible.
3. No test changes needed — this is a pure visual CSS-value change with no existing or required test coverage surface (confirmed in the Codebase Impact Scan: no test asserts on `--surface`'s value or computed background color).

## Test Requirements

- No new/updated automated tests required — a single CSS custom-property value has no meaningful unit-test surface in this codebase's test suite.
- Full existing suite must still pass unaffected (regression check only).
- Coverage target: N/A for this change (`globals.css` is not instrumented).

## Out of Scope

- Card/panel backgrounds (currently `#fff`) — not changed
- Primary/accent colors, button colors, border colors — not changed
- Dark mode — this app has no dark mode; not applicable

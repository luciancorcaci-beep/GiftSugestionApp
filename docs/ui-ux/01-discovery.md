# UI/UX Discovery

**Project**: What Gift Should I Choose
**Date**: 2026-09-16
**Workflow**: aire-ui-ux-design

## Context

- Platform: Responsive web, desktop + tablet + mobile
- Tech: Next.js, TypeScript, Tailwind conventions, Vitest + RTL
- Architecture: Layered monolith; single-page recommendation flow
- Auth: No login; single Buyer role
- Core flow: age + budget + relationship + interests -> exactly 3 gift suggestions
- Relationship options: Friend, Partner, Parent, Child, Sibling, Colleague
- Navigation: No persistent navigation

## Design Decisions

- Emotion: Friendly and approachable
- Density: Medium; balanced form and results
- Design system: Tailwind-aligned custom composition
- Errors: Inline, adjacent to the relevant field or state
- Loading: Hybrid; progress indicator plus recommendation-shaped placeholders
- Color direction: Teal + charcoal; avoid purple-heavy palettes
- Accessibility: WCAG AA minimum
- Inspiration: None supplied; create a focused gift-discovery direction
- Responsive target: All viewports

## UX Constraints

- Keep the first screen focused on completing the recommendation form.
- Make exactly three results visually distinct and easy to compare.
- Keep purchase links secondary to the recommendation rationale.
- Preserve entered values when generation fails so the user can retry.
- Do not expose provider keys, prompt details, or internal errors.

# Enhancement Request & Impact Report — ENHANCEMENT-2

Date: 2026-09-25
Author: PRODUCT_OWNER & ARCHITECT
Status: DRAFT

## 1. Title

Change the page background to a pleasant light blue

## 2. What Needs to Change

The page background color (the `--surface` CSS variable in `src/app/globals.css`, applied to `body`) should change from its current warm cream (`#faf0dc`, set in Enhancement 1) to a soft sky blue (`#e0f2fe`).

## 3. Current Behaviour

`src/app/globals.css` defines `--surface: #faf0dc` in the `:root` block, and `body { background: var(--surface); ... }` applies it as the page-wide background behind the hero section and the form panel.

## 4. Desired Behaviour

`--surface` renders as `#e0f2fe` instead — a gentle, airy light blue that pairs well with the app's existing teal primary color (`--primary: #0f766e`). Everything else (text color, card backgrounds, buttons, borders, accent color) stays exactly as it is today; only the page background's color changes.

## 5. Why (Business or UX Value)

Purely a visual refinement/preference change: a light blue background is calmer and more "airy" than the cream tone, and harmonizes with the existing teal primary color already used for buttons and headings. Low risk — it's a light-on-light change with no functional impact.

## 6. Acceptance Criteria

- [ ] `--surface` in `src/app/globals.css` is updated from `#faf0dc` to `#e0f2fe`
- [ ] The page body visibly renders the new light blue tone when loaded in a browser
- [ ] No other colors (text, buttons, cards, borders, accent) are changed
- [ ] Text remains clearly legible against the new background (no contrast regression)

## 7. Out of Scope

- Card/panel backgrounds (currently `#fff`) — not changed
- Primary/accent colors, button colors, border colors — not changed
- Dark mode — this app has no dark mode; not applicable

---

## 8. Codebase Impact Scan (Architect)

### Affected Files

| Path | Component / Function | Change Required |
| :--- | :-------------------- | :--------------- |
| `src/app/globals.css:5` | `:root` CSS custom property `--surface` | Change value from `#faf0dc` to `#e0f2fe` |

`--surface` has exactly one consumer in the stylesheet — `body { background: var(--surface); }` at `src/app/globals.css:17` — so changing the variable's definition is the entire change. No component file needs to change.

### Detected Story Linkage

- **Related-Story**: epic-1-story-1.2 (Frontend Shell and Form Skeleton)
- **Sub-Story-ID**: 1.2b
- **Evidence**: Same match as Enhancement 1 (`docs/plans/stories/epic-1-story-1.2-frontend-shell.md` owns `src/app/page.tsx` and its styling). `docs/plans/stories/enhancement-epic-1-story-1.2a-deepen-page-background-cream-tone.md` already exists as `1.2a` (Enhancement 1), so the next available letter suffix is `1.2b`.

### Tests Affected

| Path | Coverage notes |
| :--- | :-------------- |
| — | No existing test asserts on `--surface`'s value or the rendered background color (pure CSS, not exercised by the RTL/vitest suite). None need updating; none need adding. |

### Risks

- **Contrast regression** — mitigation: `#e0f2fe` is a very light, high-luminance blue, and `--text: #202a2a` is a dark near-black; contrast ratio remains comfortably in the same range as the current cream background — verify visually in Phase 7.
- **Rapid successive background changes (Enhancement 1 → 2 on the same variable within the same day)** — mitigation: no functional risk since it's the same single-line change pattern; noted here only for traceability — `git log -- src/app/globals.css` will show both changes clearly.

### Suggested Approach

1. In `src/app/globals.css`, change `--surface: #faf0dc;` to `--surface: #e0f2fe;` (line 5).
2. Run `npm run build && npm run start` (or `npm run dev`) and visually confirm the page background renders the new light blue tone and text remains legible.
3. No test changes needed — this is a pure visual CSS-value change with no existing or required test coverage surface.

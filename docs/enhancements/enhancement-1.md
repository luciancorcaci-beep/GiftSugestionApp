# Enhancement Request & Impact Report — ENHANCEMENT-1

Date: 2026-09-25
Author: PRODUCT_OWNER & ARCHITECT
Status: DRAFT

## 1. Title

Deepen the page background to a warmer cream tone

## 2. What Needs to Change

The page background color (the `--surface` CSS variable in `src/app/globals.css`, applied to `body`) should change from its current very light cream (`#fffbf5`) to a slightly warmer, deeper cream (`#faf0dc`) — staying in the same warm-neutral color family, just a noticeably richer shade of it.

## 3. Current Behaviour

`src/app/globals.css` defines `--surface: #fffbf5` in the `:root` block, and `body { background: var(--surface); ... }` applies it as the page-wide background behind the hero section and the form panel.

## 4. Desired Behaviour

`--surface` renders as `#faf0dc` instead — a slightly warmer, deeper cream. Everything else (text color, card backgrounds, buttons, borders, accent color) stays exactly as it is today; only the page background's specific shade changes, within the same warm-cream range.

## 5. Why (Business or UX Value)

Purely a visual refinement: a slightly deeper cream gives the page a touch more warmth and coziness, which fits a gift-recommendation app's tone, without altering the palette family or introducing any accessibility/contrast risk — it's a light-on-light adjustment of degree, not a redesign.

## 6. Acceptance Criteria

- [ ] `--surface` in `src/app/globals.css` is updated from `#fffbf5` to `#faf0dc`
- [ ] The page body visibly renders the new cream tone when loaded in a browser
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
| `src/app/globals.css:5` | `:root` CSS custom property `--surface` | Change value from `#fffbf5` to `#faf0dc` |

`--surface` has exactly one consumer in the stylesheet — `body { background: var(--surface); }` at `src/app/globals.css:17` — so changing the variable's definition is the entire change. No component file needs to change.

### Detected Story Linkage

- **Related-Story**: epic-1-story-1.2 (Frontend Shell and Form Skeleton)
- **Sub-Story-ID**: 1.2a
- **Evidence**: `docs/plans/stories/epic-1-story-1.2-frontend-shell.md` owns `src/app/page.tsx` and its Implementation Steps include "Set up the home page and main layout with aligned spacing and basic styling" — the closest-specificity match for a page-background styling change. No story explicitly names `globals.css`.

### Tests Affected

| Path | Coverage notes |
| :--- | :-------------- |
| — | No existing test asserts on `--surface`'s value or the rendered background color (it's pure CSS, not exercised by the RTL/vitest suite, which tests markup/behavior, not computed styles). None need updating; none need adding — a CSS custom-property value has no meaningful unit-test surface here. |

### Risks

- **CSS variable used elsewhere in the future** — mitigation: confirmed via grep this is the variable's only consumer today; if a future change adds a second consumer expecting the old shade, that's a separate concern at that time.
- **Contrast regression** — mitigation: `#faf0dc` is still a very light, high-luminance color (similar to `#fffbf5`), and `--text: #202a2a` is a dark near-black; contrast ratio remains comfortably in the same range as today's — verify visually in Phase 7.

### Suggested Approach

1. In `src/app/globals.css`, change `--surface: #fffbf5;` to `--surface: #faf0dc;` (line 5).
2. Run `npm run build && npm run start` (or `npm run dev`) and visually confirm the page background renders the new tone and text remains legible.
3. No test changes needed — this is a pure visual CSS-value change with no existing or required test coverage surface.

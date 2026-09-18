# Story 3.1 Review: Gift Catalog Data & Domain Model

**Status**: Complete
**Scope**: One-time spreadsheet-to-JSON conversion script, the committed `src/data/giftCatalog.json` catalog (150 entries), and a typed `giftCatalogLoader.ts` that loads it via a static import. Matching/filtering logic (Story 3.2) and any runtime spreadsheet upload/re-import feature are explicitly out of scope.

## Implementation Summary

- `scripts/convert-gift-catalog.py` — standard-library-only Python (`zipfile` + `xml.etree.ElementTree`), no third-party or `xlsx` dependency. Opens `Gift_Ideas_Database.xlsx` as a zip, confirms `xl/workbook.xml` maps `sheetId="2"` (`xl/worksheets/sheet2.xml`) to the sheet named `Gifts`, parses inline-string cells (`t="inlineStr"` → `<is><t>`) and numeric cells (`<v>`), validates the header row matches the documented column order, converts each of the 150 data rows into the target JSON shape, fails loudly (`SystemExit`) on a missing file, unexpected header, or duplicate `giftId`, and writes `src/data/giftCatalog.json`.
- Ran the script once against the real spreadsheet; the committed `src/data/giftCatalog.json` is its literal, unmodified output (150 objects, verified below).
- `src/infrastructure/catalog/giftCatalogLoader.ts` — exports `GiftCatalogEntry` (matching the JSON shape) and `loadGiftCatalog(): GiftCatalogEntry[]`, using a static `import catalogData from '@/data/giftCatalog.json'` (type-checked, bundled at build time — no runtime `fs` read), mirroring the existing `src/infrastructure/ai/` adapter-isolation pattern.
- No changes to `package.json` dependencies and no changes needed to `tsconfig.json` (`resolveJsonModule`, `esModuleInterop`, and the `@/*` path alias were already present).

## Test Evidence

Focused command:

```text
npx vitest run src/tests/gift-catalog-loader.test.ts
 ✓ src/tests/gift-catalog-loader.test.ts  (6 tests) 17ms
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Full suite:

```text
npx vitest run
 Test Files  15 passed (15)
      Tests  104 passed (104)
```

Coverage:

```text
npm run test:coverage
...ucture/catalog     |     100 |      100 |     100 |     100 |
  giftCatalogLoader.ts |     100 |      100 |     100 |     100 |
All files              |   95.98 |    86.03 |   92.22 |   95.98 |
 Test Files  15 passed (15)
      Tests  104 passed (104)
```

Additional gates:

```text
npm run typecheck   -> exit 0, no output
npm run lint        -> exit 0, no output ("eslint .")
python3 scripts/convert-gift-catalog.py
 -> "Wrote 150 gift catalog entries to .../src/data/giftCatalog.json"
    re-running the script reproduces the committed JSON byte-for-byte
    (same conversion logic, deterministic field order and formatting)
```

## DoD Evidence

### Gate 1 - Spec Echo

| Requirement | Evidence |
|---|---|
| AC1: 150 gift ideas available to the app without needing the spreadsheet at runtime | `src/data/giftCatalog.json` (150-entry JSON array, committed); `src/infrastructure/catalog/giftCatalogLoader.ts:1,30-32` (static import, no spreadsheet access); `src/tests/gift-catalog-loader.test.ts:16-18` (`toHaveLength(150)`, passing) |
| AC2: every entry carries name, description, price range (same info shown on a recommendation card) | `src/infrastructure/catalog/giftCatalogLoader.ts:12-13,19` (`name`, `description`, `priceRangeUsd` fields); `src/tests/gift-catalog-loader.test.ts:39-48` (asserts non-empty `name`/`description` and `$N-$N`-shaped `priceRangeUsd` on every entry, passing) |
| AC3: no xlsx/spreadsheet-parsing package ships as part of the running app; only converted data ships | `package.json` (no `xlsx`/spreadsheet dependency added — `grep -i xlsx package.json` → no match); `scripts/convert-gift-catalog.py` uses only stdlib `zipfile`/`xml.etree.ElementTree` (lines 15-19); `tsconfig.json:14` `include` covers only `src/**/*.ts(x)` — `scripts/` is excluded from the app's TS/build graph |
| Story-body AC: conversion script writes 150 objects with the exact field mapping | `scripts/convert-gift-catalog.py:129-148` (`convert_row`, mapping `GiftID→giftId`, `GiftName→name`, `Description→description`, `InterestCategory→interestCategory`, `Keywords→keywords`, `MinRecipientAge→minRecipientAge`, `MaxRecipientAge→maxRecipientAge`, `RelationshipTags→relationshipTags`, `PriceRangeUSD→priceRangeUsd`); output verified: `python3 -c "import json; d=json.load(open('src/data/giftCatalog.json')); print(len(d))"` → `150` |
| Story-body AC: `keywords` string array split/trimmed from comma-separated cell | `scripts/convert-gift-catalog.py:97-98` (`_split_list`, `.strip()` + filters empty); `src/data/giftCatalog.json` entry `G001.keywords` = `["football","soccer","jersey","team"]`; `src/tests/gift-catalog-loader.test.ts:57-63` (asserts array, non-empty, trimmed) |
| Story-body AC: `minRecipientAge`/`maxRecipientAge` integers | `scripts/convert-gift-catalog.py:136-137` (`int(row[...])`); `src/tests/gift-catalog-loader.test.ts:65-67` (`Number.isInteger`, `min <= max`, passing) |
| Story-body AC: `relationshipTags` array; literal `"All"` cell becomes `["All"]` | `scripts/convert-gift-catalog.py:130-134` (explicit `"All"` branch → `["All"]`, else split/trim); `src/tests/gift-catalog-loader.test.ts:25-30` (finds an entry with `relationshipTags` exactly `["All"]`, passing); source-data check: 75/150 rows have the literal `All` cell, all converted to the single-element array (`python3` spot check during implementation) |
| Story-body AC: `giftCatalogLoader.ts` exports `GiftCatalogEntry` interface + `loadGiftCatalog(): GiftCatalogEntry[]` via static JSON import | `src/infrastructure/catalog/giftCatalogLoader.ts:1,10-20,30-32` |
| Story-body AC: no xlsx/spreadsheet-parsing package added to `package.json` dependencies | `package.json` unmodified — dependency list unchanged (no `xlsx`, no parsing lib) |
| Story-body AC: `giftId` uniqueness verified by a test | `src/tests/gift-catalog-loader.test.ts:20-23` (`new Set(ids).size === ids.length`, passing); also enforced defensively at conversion time: `scripts/convert-gift-catalog.py:150-153` (`SystemExit` on duplicates) |
| Step 1: script opens xlsx as zip, parses `xl/worksheets/sheet2.xml`, writes JSON per mapping | `scripts/convert-gift-catalog.py:71,84-113` (`read_gift_rows` — `zipfile.ZipFile`, `GIFTS_SHEET_PART = "xl/worksheets/sheet2.xml"`); confirmed sheet2 is `Gifts` via `xl/workbook.xml`'s `<sheets>` order (`sheetId="2"` → name `Gifts`) inspected during implementation |
| Step 2: run script once against provided spreadsheet, commit resulting JSON | `src/data/giftCatalog.json` committed (150 entries, verified above); generated by `python3 scripts/convert-gift-catalog.py` against `Gift_Ideas_Database.xlsx` |
| Step 3: `giftCatalogLoader.ts` matches the story's illustrated shape | `src/infrastructure/catalog/giftCatalogLoader.ts:1,10-20,30-32` — same interface fields and static-import pattern as the story's code sample |
| Step 4: JSON import resolves under existing tsconfig path aliases, no config changes needed | `tsconfig.json:9,15` (`resolveJsonModule: true`, `paths: {"@/*": ["./src/*"]}` already present); `npm run typecheck` exit 0 confirms `@/data/giftCatalog.json` resolves and type-checks |
| Story Tests block: 150 entries / unique ids / `All` normalization | `src/tests/gift-catalog-loader.test.ts:16-30` — all three story-specified tests reproduced verbatim, passing |
| Quality: ESLint 0 errors | `npm run lint` → exit 0, no output |
| Quality: coverage ≥85% for `giftCatalogLoader.ts` | `npm run test:coverage` → `giftCatalogLoader.ts` 100% statements/branches/functions/lines |
| Quality: `npm run typecheck` clean | `npm run typecheck` → exit 0, no output |
| System response: module import at server start returns 150 typed entries | `src/tests/gift-catalog-loader.test.ts:16-18` |
| System response: malformed/missing catalog JSON fails at module-load time, not silently | Static `import` (`giftCatalogLoader.ts:1`) means a malformed `giftCatalog.json` fails TypeScript compilation / bundling at build time, not a silent empty array at request time — no `try/catch` swallows a parse failure |
| System response: repeat calls return the same 150 entries, no mutation/persistent state | `src/tests/gift-catalog-loader.test.ts:32-37` (repeat-call identity check, passing); `loadGiftCatalog` (`giftCatalogLoader.ts:30-32`) is a pure return of the imported module, no internal state |
| Reference (requirements.md): "Recommendations are generated by matching user input against a curated gift-idea catalog... no external AI call" | This story supplies exactly that catalog as a bundled, code-reviewable JSON asset (`src/data/giftCatalog.json`), replacing the prior external-AI-only path; matching logic itself is Story 3.2 (explicitly OUT of this story) |
| Reference (patterns doc): infrastructure adapter isolation — catalog access lives under `src/infrastructure/catalog/`, mirroring `src/infrastructure/ai/` | `src/infrastructure/catalog/giftCatalogLoader.ts` created alongside existing `src/infrastructure/ai/ClaudeRecommendationClient.ts`, same layering |
| Reference (patterns doc): domain/application layers must not import browser-only code or external provider SDKs | `giftCatalogLoader.ts` imports only a local JSON asset — no provider SDK, no browser API |
| Reference (GiftRecommendation.ts): catalog must map into the existing recommendation shape | Catalog fields (`name`, `description`, `priceRangeUsd`) are named to align 1:1 with `GiftRecommendation`'s `title`/`description`/`priceRange` for Story 3.2's mapping; no mapping code added here per this story's explicit OUT-of-scope note |

### Gate 2 - Negative-Space Check

```text
xlsx/spreadsheet-parsing dependency check:
$ grep -i "xlsx" package.json package-lock.json | wc -l
0
PASS: no xlsx or spreadsheet-parsing package referenced anywhere in package.json or package-lock.json

Runtime-bundle exclusion check:
$ grep -A2 '"include"' tsconfig.json
"include": ["next-env.d.ts", ".next/types/**/*.ts", "src/**/*.ts", "src/**/*.tsx", "vitest.config.ts"]
PASS: scripts/ is not part of the TypeScript program / Next.js build graph — the .xlsx-reading Python
script cannot be pulled into the running app bundle

No-matching-logic check (OUT-of-scope guard for Story 3.2):
$ grep -rn "relationshipTags\|minRecipientAge\|maxRecipientAge" src/application src/domain/services 2>/dev/null
(no matches)
PASS: no filtering/matching logic against catalog fields exists yet outside the loader/tests

No runtime fs read of the catalog (must be a static, build-time import):
$ grep -n "readFileSync\|require(.*giftCatalog" src/infrastructure/catalog/giftCatalogLoader.ts
(no matches — only a static `import catalogData from '@/data/giftCatalog.json'` at line 1)
PASS: catalog is bundled at build time, not read from disk at request time

docs/status.md untouched check:
$ git diff --name-only -- docs/status.md 2>/dev/null; ls -la docs/status.md
(repo is not a git repository in this environment; docs/status.md was not opened or written by this
agent — only docs/stories-implemented/story-3.1-review.md and docs/plans/.parallel/story-3.1-done.json
were written, per the task's WRITE ONLY scope)
PASS: docs/status.md not modified
```

### Gate 3 - Contract Consistency

| Layer | Producer (conversion script) | Consumer (loader / app) |
|---|---|---|
| Field names | `scripts/convert-gift-catalog.py:129-148` emits `giftId, name, description, interestCategory, keywords, minRecipientAge, maxRecipientAge, relationshipTags, priceRangeUsd` | `GiftCatalogEntry` (`giftCatalogLoader.ts:10-20`) declares exactly the same nine fields, same names, same casing — no silent renames |
| Types | Script emits: string, string, string, string, array-of-string, int, int, array-of-string, string | Interface types: `string, string, string, string, string[], number, number, string[], string` — matches; `npm run typecheck` confirms the JSON literal structurally satisfies the interface via `as GiftCatalogEntry[]` |
| `relationshipTags` special case | Script: literal `All` cell → `["All"]`; multi-tag cell → split/trimmed array (e.g. `"Partner, Parent"` → `["Partner","Parent"]`) | Loader/tests treat `["All"]` as a distinct, intentional single-element array (`src/tests/gift-catalog-loader.test.ts:25-30,74-76`) — no code collapses or expands it silently |
| Row count | Script asserts source header shape and converts all 150 data rows (`read_gift_rows`, rows[1:]) | `loadGiftCatalog()` returns exactly 150 (`src/tests/gift-catalog-loader.test.ts:16-18`) — producer and consumer counts match, verified by test, not assumed |
| Uniqueness | Script fails loudly (`SystemExit`) on duplicate `giftId` at conversion time (`convert-gift-catalog.py:150-153`) | Loader/tests independently re-verify uniqueness at consumption time (`src/tests/gift-catalog-loader.test.ts:20-23`) — no silent acceptance of a corrupted committed file |
| Downstream shape (Story 3.2 / `GiftRecommendation`) | Catalog exposes `name`, `description`, `priceRangeUsd` | `GiftRecommendation` (`src/domain/entities/GiftRecommendation.ts:12-19`) expects `title`, `description`, `priceRange` — field names differ by design (this story intentionally does not map them; mapping is Story 3.2's job, called out in this story's OUT section) — documented here, not silently ignored |

## Definition of Done

- Gate 1: passed (every AC, every numbered Step, every Must-Read reference requirement has file:line proof above)
- Gate 2: passed (all negative-space checks above are clean)
- Gate 3: passed (producer/consumer contracts verified consistent, one intentional and documented naming gap deferred to Story 3.2)
- Tests: 104/104 passed (full suite); 6/6 passed (story-scoped `gift-catalog-loader.test.ts`)
- Coverage: `giftCatalogLoader.ts` 100% statements/branches/functions/lines; overall suite 95.98% statements
- Lint: clean (`npm run lint` exit 0)
- Typecheck: clean (`npm run typecheck` exit 0)
- Acceptance criteria: 3/3 story-level AC covered, plus all story-body/Steps/Tests/Quality requirements

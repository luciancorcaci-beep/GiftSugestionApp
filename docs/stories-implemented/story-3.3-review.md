# Story 3.3 Review: Wire In Catalog Provider & Retire the AI Adapter

**Epic**: 3 - CURATED GIFT CATALOG | **ID**: 3.3 | **Date**: 2026-09-18

## Summary

Swapped `createGiftSuggestionsHandler`'s default `provider` from `ClaudeRecommendationClient` to
`CatalogRecommendationProvider`, deleted the retired Claude adapter and its dedicated tests, removed
the concurrency limiter and its wiring from the handler (no longer meaningful for a synchronous,
free, in-memory match), removed the now-fully-unreferenced `ServiceBusyError`,
`ProviderTimeoutError`, and `ProviderConfigurationError` from `src/lib/errors.ts`, and dropped the
Claude-specific variables from `.env.example` while keeping `TRUSTED_PRODUCT_DOMAINS`. The
per-client rate limiter and the body-size cap are untouched and still enforced.

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/gift-suggestions/handler.ts` | Default provider swapped to `CatalogRecommendationProvider`; removed `ConcurrencyLimiter` import/instance/param, `acquiredConcurrencySlot`, the `SERVICE_BUSY` branch, and the `finally` release block |
| `src/infrastructure/ai/ClaudeRecommendationClient.ts` | Deleted (directory `src/infrastructure/ai/` removed, now empty) |
| `src/lib/errors.ts` | Removed `ServiceBusyError`, `ProviderTimeoutError`, `ProviderConfigurationError` (all fully unreferenced after the handler/adapter changes); kept `ProviderRateLimitError` (still used by `RecommendationService.ts`), `RecommendationServiceError`, `RecommendationProviderError`, `ValidationError`, `TooManyRequestsError`, `PayloadTooLargeError` |
| `.env.example` | Removed `CLAUDE_API_KEY`, `CLAUDE_API_URL`, `CLAUDE_MODEL`, `CLAUDE_REQUEST_TIMEOUT_MS`; kept `TRUSTED_PRODUCT_DOMAINS` |
| `src/tests/gift-suggestions-api.test.ts` | Removed `describe('ClaudeRecommendationClient', ...)` block and its 4 tests; removed the `SERVICE_BUSY`/concurrency-limiter test; removed `ConcurrencyLimiter` from `createTestHandler`'s default overrides; removed now-unused imports (`ClaudeRecommendationClient`, `ProviderTimeoutError`, `ProviderConfigurationError`, `ConcurrencyLimiter`); added `describe('POST /api/gift-suggestions (catalog-backed)', ...)` with a new test proving exactly 3 recommendations with no `CLAUDE_API_KEY` configured, exercising the real default `CatalogRecommendationProvider` (no provider override) |

No changes were made to `src/lib/rateLimiter.ts` or `src/tests/rate-limiter.test.ts`: `ConcurrencyLimiter` remains defined there as a general-purpose utility class with its own tests — it is simply no longer wired into the handler, matching the story's file-touch scope (only `handler.ts`, `ClaudeRecommendationClient.ts`, `.env.example` are listed as touched files, plus `errors.ts` and the test file per the explicit Steps).

## Test Evidence

Full suite (`npm run test:coverage`):

```
 Test Files  16 passed (16)
      Tests  130 passed (130)
   Duration  1.19s
```

Coverage (v8):

```
All files          |   96.51 |     88.4 |    92.7 |   96.51 |
 handler.ts        |     100 |      100 |     100 |     100 |
 errors.ts         |     100 |      100 |     100 |     100 |
 rateLimiter.ts     |     100 |      100 |     100 |     100 |
```

Overall statement coverage: **96.51%** (≥85% threshold met).

`npm run typecheck` → clean (no output, exit 0).
`npm run lint` → clean, 0 errors.

## Real Server Smoke Test (no `.env` present)

Per the story's mandatory manual step and the lesson from `docs/reviews/all-stories-code-review-v2.md`
NEW-001 (a passing unit suite hid a real-server regression), a full build + real running server was
exercised with no `.env` file on disk at all:

```
$ npm run build
✓ Compiled successfully
✓ Generating static pages (6/6)
Route (app)                              Size     First Load JS
┌ λ /                                    3.9 kB         84.2 kB
├ λ /api/gift-suggestions                0 B                0 B
└ λ /api/health                          0 B                0 B

$ mv .env .env.smoke-backup   # no .env present for the run
$ PORT=4173 npm run start &

$ curl -s -o - -w "HEALTH_STATUS:%{http_code}\n" http://localhost:4173/api/health
{"status":"ok"}
HEALTH_STATUS:200

$ curl -s -o - -w "GIFT_STATUS:%{http_code}\n" -X POST http://localhost:4173/api/gift-suggestions \
  -H 'content-type: application/json' \
  -d '{"recipientAge":30,"budget":50,"relationship":"Friend","interests":"music"}'
{"recommendations":[
  {"id":"G022","title":"Noise-Cancelling Headphones", ...},
  {"id":"G025","title":"Concert Tickets (Gift Card)", ...},
  {"id":"G024","title":"Beginner Ukulele", ...}
]}
GIFT_STATUS:200

$ mv .env.smoke-backup .env   # restored the user's real .env afterward
```

Result: `GET /api/health` → `200`; `POST /api/gift-suggestions` → `200` with exactly 3
catalog-backed recommendations, with no `.env` file present and no `CLAUDE_API_KEY` (or any
Claude-related variable) set anywhere in the process environment. This proves the app no longer
depends on any Claude configuration.

## Grep Verification

```
$ grep -rn "ClaudeRecommendationClient" --include="*.ts" --include="*.tsx" src/   -> no matches
$ grep -rn "anthropic.com" --include="*.ts" --include="*.tsx" src/                -> no matches
$ grep -rn "CLAUDE_API_KEY" --include="*.ts" --include="*.tsx" src/               -> 2 matches, both in
   src/tests/gift-suggestions-api.test.ts, both intentional: the test name and an
   `expect(process.env.CLAUDE_API_KEY).toBeUndefined()` assertion added specifically to prove the
   absence of this variable (task requirement #6). No production code path references it.
$ ls src/infrastructure/ai   -> No such file or directory (deleted along with its now-empty parent)
```

Historical docs under `docs/reviews/`, `docs/stories-implemented/`, `docs/testing/`,
`docs/architecture/`, and `docs/plans/` still mention `ClaudeRecommendationClient`/`CLAUDE_API_KEY` —
left untouched, as instructed (historical record, out of scope).

## DoD Evidence

### Gate 1 — Spec Echo (one row per AC / Step / reference requirement)

| # | Requirement | Source | Proof (file:line) |
|---|-------------|--------|--------------------|
| AC1 | `createGiftSuggestionsHandler`'s default `provider` constructs `CatalogRecommendationProvider`, not `ClaudeRecommendationClient` | Story AC | `src/app/api/gift-suggestions/handler.ts:41` (`provider = new CatalogRecommendationProvider()`) |
| AC2 | `ClaudeRecommendationClient.ts` and its dedicated tests are deleted, not left dead | Story AC | `ls src/infrastructure/ai` → not found; `src/tests/gift-suggestions-api.test.ts` no longer contains `describe('ClaudeRecommendationClient', ...)` |
| AC3 | `ConcurrencyLimiter`, `acquiredConcurrencySlot`, `SERVICE_BUSY` path removed from handler; `ServiceBusyError` removed from errors.ts if unreferenced | Story AC | `src/app/api/gift-suggestions/handler.ts:1-74` (no `ConcurrencyLimiter`/`acquiredConcurrencySlot`/`ServiceBusyError` present); `src/lib/errors.ts` (class deleted); grep confirms zero remaining references |
| AC4 | Rate limiter (`FixedWindowRateLimiter`, `x-real-ip`/XFF key derivation, `RATE_LIMITED` + `Retry-After`) and body-size cap (`readBoundedJson`, `PAYLOAD_TOO_LARGE`) unchanged and enforced | Story AC | `src/app/api/gift-suggestions/handler.ts:7,25,33-38,53-56,58`; unchanged tests `src/tests/gift-suggestions-api.test.ts:188-234` all pass |
| AC5 | `.env.example` no longer lists `CLAUDE_API_KEY`/`CLAUDE_API_URL`/`CLAUDE_MODEL`/`CLAUDE_REQUEST_TIMEOUT_MS` | Story AC | `.env.example` (1 line, `TRUSTED_PRODUCT_DOMAINS=amazon.com` only) |
| AC6 | `TRUSTED_PRODUCT_DOMAINS` stays in `.env.example` | Story AC | `.env.example:1` |
| AC7 | Fresh `npm run build && npm run start` with no `.env` returns real 3-card recommendations | Story AC | Real Server Smoke Test section above — `POST /api/gift-suggestions` → 200, 3 recommendations, no `.env` present |
| Step 1 | Update handler default provider; remove `ConcurrencyLimiter` import/instance/dependency/`acquiredConcurrencySlot`/finally | Story Steps | `src/app/api/gift-suggestions/handler.ts:5,7,12-19,25,40-47,52-73` |
| Step 2 | Delete `ClaudeRecommendationClient.ts` + dedicated tests; remove now-unused imports (`ProviderTimeoutError`, `ProviderConfigurationError`, `ProviderRateLimitError` — keep only reachable types) | Story Steps | File deleted; `src/tests/gift-suggestions-api.test.ts:1-10` imports trimmed to `ProviderRateLimitError`, `RecommendationProviderError` (both still reachable via `RecommendationService`) |
| Step 3 | Remove `ServiceBusyError` from errors.ts if unreferenced | Story Steps | `src/lib/errors.ts` — class removed; grep confirms 0 references remain |
| Step 4 | Update `.env.example`, keep `TRUSTED_PRODUCT_DOMAINS` | Story Steps | `.env.example` |
| Step 5 | Re-run full suite, lint, typecheck, real build+start smoke test with no `.env` | Story Steps | Test Evidence + Real Server Smoke Test sections above |
| Req (requirements.md:90) | "Recommendations are generated by matching user input against a curated gift-idea catalog ... no external AI call" | `docs/requirements.md:90` | `src/app/api/gift-suggestions/handler.ts:41` defaults to `CatalogRecommendationProvider` (in-memory, no `fetch`) |
| Req (all-stories-code-review-v1.md HIGH-001) | Rate limiter + body cap are the abuse-control baseline; concurrency limiter/timeout were specific to bounding a slow paid external call | `docs/reviews/all-stories-code-review-v1.md:36-52` | Rate limiter (`defaultRateLimiter`) and `readBoundedJson`/`MAX_BODY_BYTES` retained unchanged in `handler.ts:9,21,25,58`; concurrency limiter removed per Step 1 |
| Req (all-stories-code-review-v2/v3 NEW-002) | In-memory/single-process rate-limiter scaling limitation remains accepted, out of scope for this story | `docs/reviews/all-stories-code-review-v2.md:88-99`, `v3.md:39` | Not touched — `defaultResolveClientKey`/`FixedWindowRateLimiter` logic and its explanatory comment (`handler.ts:27-38`) left exactly as-is; explicitly listed under story `OUT` |

### Gate 2 — Negative-Space Check

- No remaining construction of `ClaudeRecommendationClient` anywhere (`grep` returns 0 matches in `src/`).
- No remaining reference to `CLAUDE_API_KEY`/`CLAUDE_API_URL`/`CLAUDE_MODEL`/`CLAUDE_REQUEST_TIMEOUT_MS` in production code (2 intentional test-only references proving absence, not a dependency).
- No remaining reference to `anthropic.com` in `src/`.
- No remaining reference to `ServiceBusyError`, `ProviderTimeoutError`, `ProviderConfigurationError`, or `SERVICE_BUSY` anywhere in `src/` (`grep` returns 0 matches).
- `src/infrastructure/ai/` directory no longer exists.
- `npm run lint` reports 0 errors (no leftover unused imports).
- `npm run typecheck` reports 0 errors.
- The rate-limit and body-cap tests were **not rewritten** — diffed against the pre-change file, their bodies are byte-for-byte identical; only the unrelated `ConcurrencyLimiter` override/import lines and the SERVICE_BUSY test/Claude describe block were removed.

### Gate 3 — Contract Consistency

- `RecommendationProvider` interface (`generate(input): Promise<unknown>`) unchanged in `src/domain/services/RecommendationService.ts` — `CatalogRecommendationProvider` (Story 3.2) already satisfies it, so no other call site needed changes.
- Request/response JSON contract unchanged: `POST /api/gift-suggestions` still returns `{ recommendations: GiftRecommendation[] }` on success and `{ error: { code, message } }` on failure, verified by unchanged assertions in `src/tests/gift-suggestions-api.test.ts`.
- `route.ts` (`export const POST = createGiftSuggestionsHandler();`) required no changes — the default-provider swap is fully internal to `handler.ts`.
- `GiftSuggestionsDependencies` type still accepts an injectable `provider` for tests; no test outside this story relies on the removed `concurrencyLimiter` field (`ConcurrencyLimiter`'s own unit tests in `rate-limiter.test.ts` are independent of the handler and remain green).

## Out of Scope (per story)

- Rate limiter's client-key derivation/thresholds — unchanged, not addressed.
- The documented in-memory/serverless rate-limiter scaling limitation (`docs/reviews/all-stories-code-review-v3.md`) — remains a tracked, accepted limitation, not addressed by this story.

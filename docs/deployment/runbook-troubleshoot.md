# Runbook: Troubleshoot

## Build fails on Vercel

1. Vercel dashboard → the failed deployment → **Build Logs**.
2. Reproduce locally first: `npm ci && npm run build`. This project's CI (`.github/workflows/ci.yml`, `build` job) runs the identical command on every push/PR, so a build failure on Vercel that CI didn't catch usually means an environment difference (e.g., a Node version mismatch — CI pins Node 20 via `env.NODE_VERSION`; confirm Vercel's Project Settings → General → Node.js Version is also set to 20.x).
3. Common causes in this codebase: a TypeScript error (`npm run typecheck`), a lint failure that's actually a build-breaking issue (`npm run lint`), or a missing file that wasn't committed (check `git status` / `.gitignore` for anything accidentally excluded, e.g. `src/data/giftCatalog.json` must be tracked, not gitignored, since it's a build-time asset).

## `/api/gift-suggestions` returns 5xx in production

1. Vercel dashboard → **Logs** (or the deployment's **Functions** tab) → filter to the function invocation.
2. This app has no external API dependency since Epic 3 (catalog-backed recommendations, no `CLAUDE_API_KEY`/network call) — a 5xx here points to either malformed request handling or a bug in `src/infrastructure/catalog/CatalogRecommendationProvider.ts` / `src/data/giftCatalog.json`, not an upstream outage.
3. Reproduce locally: `npm run build && npm run start`, then `curl -sS -X POST http://localhost:3000/api/gift-suggestions -H 'content-type: application/json' -d '{...}'` with the same payload shape the failing request used.
4. Check `src/lib/errors.ts` for the specific error classes still in use post-Epic-3 and match the response body's error code to its trigger condition.

## `/api/health` returns non-200

Treat as a genuine incident (not expected under any normal condition) — check Vercel function logs for the health route immediately; this endpoint has no external dependency to fail on, so a non-200 likely indicates a platform-level Vercel issue or a regression in `src/lib/health-handler.ts`.

## Rate limiting behaves unexpectedly (false positives/negatives)

Known architectural note (tracked in `docs/status.md` as NEW-002): Vercel's serverless functions are stateless/multi-instance — the in-memory `FixedWindowRateLimiter` in `src/app/api/gift-suggestions/handler.ts` does not share state across concurrent invocations or cold starts. This means production rate limiting is best-effort per-instance, not a global guarantee. This is a known, previously-flagged limitation, not a new bug — do not "fix" it ad hoc without re-consulting `docs/status.md` and the architecture decision it's tracked under.

## CI is green but Vercel deployment looks stale

Vercel's Git integration deploys independently of GitHub Actions unless "Wait for CI to pass before deploying" is enabled (see `runbook-deploy.md` step 4). If that's off, a Vercel deployment can complete before/regardless of a slower CI run — this is expected, not a bug, until that setting is turned on.

## Dependency audit / CodeQL / secret-scan failing in CI

- `dependency-audit` is intentionally `continue-on-error: true` (scoped to `--omit=dev`, tracks the known `next@13.5.11` CVEs — see `docs/deployment/pipeline-secrets.md` §Known Issue). A red run here is expected and informational until the tracked Next.js upgrade lands; it should not block a PR.
- `secret-scan` (gitleaks) or CodeQL failing is **not** expected-noise — treat any finding here as a real signal to investigate before merging.

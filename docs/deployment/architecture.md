# Deployment Architecture

**Date**: 2026-09-18

## Overview

"What Gift Should I Choose" is deployed as a single Next.js application on Vercel. There is no separate backend service, database, cache, or message queue — the app is self-contained, and gift recommendations are generated from a bundled JSON catalog (`src/data/giftCatalog.json`, 150 entries) rather than an external AI API call (see `docs/requirements.md` and Epic 3 in `docs/plans/implementation-plan.md` for why this changed from the original AI-based design).

## Diagram

```
┌─────────────┐      git push      ┌──────────────────┐
│  Developer  │ ─────────────────▶ │  GitHub (main /   │
└─────────────┘                    │  feature branches)│
                                    └─────────┬─────────┘
                                              │ webhook (on push/PR)
                          ┌───────────────────┼───────────────────┐
                          ▼                                       ▼
                 ┌──────────────────┐                 ┌──────────────────────┐
                 │ GitHub Actions CI │                 │  Vercel (Git integr.) │
                 │ lint/typecheck/   │                 │  next build           │
                 │ test+coverage/    │                 │  → serverless funcs   │
                 │ build/audit/      │                 │  → static/edge pages  │
                 │ secret-scan       │                 └──────────┬────────────┘
                 └──────────────────┘                             │
                                                     ┌─────────────┴─────────────┐
                                                     ▼                           ▼
                                          Production deployment        Preview deployment
                                          (main branch)                (per pull request)
                                          <project>.vercel.app         <project>-<hash>.vercel.app
```

## Runtime components

| Component | What it is | Where |
|---|---|---|
| Page routes | Next.js App Router pages (form UI, results UI) | `src/app/` |
| `POST /api/gift-suggestions` | Serverless function: validates input, rate-limits by client key, matches against the catalog, returns 3 suggestions | `src/app/api/gift-suggestions/route.ts` + `handler.ts` |
| `GET /api/health` | Liveness endpoint | `src/app/api/health/route.ts` |
| Recommendation engine | In-process catalog matcher (age → relationship → interest → fallback, Fisher-Yates selection of 3) — no network call | `src/infrastructure/catalog/CatalogRecommendationProvider.ts` |
| Gift catalog | 150 curated entries, bundled at build time from the original `Gift_Ideas_Database.xlsx` | `src/data/giftCatalog.json` |
| Security headers | CSP (nonce + `strict-dynamic`, conditional `unsafe-eval` in dev only for Fast Refresh) | `src/middleware.ts` |

## What's intentionally absent

- **No database** — the catalog is static, bundled JSON; no writes happen at runtime.
- **No cache/queue** — request volume and per-request cost don't warrant one.
- **No IaC (Terraform/Pulumi)** — Vercel is the entire infrastructure; there is nothing to provision outside its dashboard/Git integration.
- **No container/Nginx/SSH** — Vercel's build system produces and serves the deployment directly.
- **No external API dependency** — retired in Epic 3 along with `CLAUDE_API_KEY`; see `docs/deployment/pipeline-secrets.md`.

## Known constraints carried into production

- **Rate limiting is per-instance, not global** (`FixedWindowRateLimiter` is in-memory) — serverless functions don't share state across cold starts/instances. Tracked as NEW-002 in `docs/status.md`. Acceptable for current MVP scale; would need a shared store (e.g., Vercel KV/Upstash Redis) if abuse becomes a real concern.
- **`next@13.5.11` has known high/critical CVEs** — tracked as `NEXTJS-CVE` in `docs/status.md`; upgrade to `next@16.x` is a deliberately deferred, dedicated follow-up project, not done as part of this deployment setup.

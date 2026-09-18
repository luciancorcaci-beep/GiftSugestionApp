# Deployment Plan

**Date**: 2026-09-18
**Author**: DEVOPS Agent
**Target platform**: Vercel (confirmed in `docs/deployment/discovery-report.md`)

---

## Scope note

The generic `aire-devops-deploy` workflow assumes a server-based deployment (SSH provisioning, Docker, Nginx, Terraform-managed cloud infra, certbot-issued SSL). None of that applies here: Vercel is a Git-integrated PaaS that builds, deploys, scales, and terminates TLS itself. This plan only covers what a Vercel deployment actually needs. Explicitly out of scope, and why:

| Workflow phase | Status | Why |
|---|---|---|
| Server Setup Scripts | Skipped | No server to provision — Vercel builds from Git directly |
| Terraform IaC | Skipped | Not requested; no cloud resources to manage (no DB/cache/queue) |
| SSL & Domain | Skipped | Default `*.vercel.app` domain; Vercel auto-issues/renews TLS for it |
| Monitoring & Health (cron/syslog-based) | Skipped | Serverless — no persistent host for cron/logrotate; Vercel's own dashboard provides logs/analytics, and the app already exposes `/api/health` |

---

## 1. Target Architecture

```
Developer → git push → GitHub (main / feature branch)
                              │
                              ▼
                     GitHub Actions CI
              (lint, typecheck, test+coverage,
               build, dependency-audit, secret-scan)
                              │
                              ▼
                     Vercel (Git integration)
              ┌───────────────┴───────────────┐
              ▼                               ▼
     Push to `main`                  Pull request opened
   → Production deployment         → Preview deployment
   (production alias domain)        (unique preview URL)
```

- **Compute**: Vercel Serverless Functions (Next.js API routes: `/api/gift-suggestions`, `/api/health`) + static/edge-rendered pages.
- **Data**: none external — `src/data/giftCatalog.json` is bundled into the deployment artifact at build time (Story 3.1). No database, cache, or queue.
- **CDN/TLS**: Vercel's edge network and automatic TLS for both the production domain and every preview URL.

## 2. Environment Strategy

| Environment | Trigger | Domain |
|---|---|---|
| Production | Push/merge to `main` | Default `<project>.vercel.app` (per discovery: no custom domain yet) |
| Preview | Any pull request | Unique auto-generated `<project>-<hash>-<team>.vercel.app` per PR, updated on every push to the PR branch |

This matches the branch strategy confirmed in `aire-devops-discover` ("main → prod, PR previews").

## 3. Secrets & Environment Variables

No change from `docs/deployment/pipeline-secrets.md`: zero required secrets in GitHub Actions or Vercel. The only optional runtime variable is `TRUSTED_PRODUCT_DOMAINS` (defaults to `amazon.com`), set in the Vercel dashboard only if that default needs overriding.

## 4. CI Gate Before Deploy

Vercel's Git integration deploys independently of GitHub Actions by default (both fire on the same push). The existing `.github/workflows/ci.yml` (lint, typecheck, test+coverage ≥85%, build, dependency-audit, secret-scan) is the quality gate; it does not block Vercel's deployment automatically. Recommendation, to apply once the GitHub remote exists: enable **Vercel → Project Settings → Git → "Wait for CI to pass before deploying"** so a red CI run on `main` cannot ship. This is a one-time dashboard toggle, not a file this repo can express.

## 5. Rollback Strategy

Vercel keeps every previous deployment (production and preview) immutably. Rollback is: **Vercel dashboard → Deployments → select the last known-good production deployment → "Promote to Production"** — no rebuild, effectively instant. See `docs/deployment/runbook-rollback.md`.

## 6. Health Check

`GET /api/health` (already implemented, `src/app/api/health/route.ts`, covered by `src/tests/health-route.test.ts`) is the liveness check. No separate monitoring script is needed to poll it: Vercel's dashboard shows function invocation errors and logs natively. If external uptime alerting is wanted later (e.g., a free tool pinging `/api/health` from outside Vercel), that is a follow-up, not part of this plan.

## 7. Known Blocker (tracked, not resolved here)

`next@13.5.11` has multiple high/critical CVEs (see `docs/deployment/pipeline-secrets.md` §Known Issue and `docs/status.md`). Vercel will happily deploy this version — it does not gate on CVEs — so this is a risk-acceptance the user has already made for now, not something this deployment plan can or should silently override.

---

## What this plan produces

- This document (Phase 1)
- `docs/deployment/runbook-deploy.md`
- `docs/deployment/runbook-rollback.md`
- `docs/deployment/runbook-troubleshoot.md`
- `docs/deployment/architecture.md`
- `docs/deployment/quick-reference.md`

No server-setup scripts, Terraform, or SSL scripts are produced, per the scope note above.

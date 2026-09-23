# DevOps Discovery Report - What Gift Should I Choose

**Date**: 2026-09-18
**Author**: DEVOPS Agent
**Status**: Confirmed with user

> **Reconfirmed 2026-09-23** (post Epic 4 / Story 4.1 — Expanded Relationship Options): re-checked against the current working tree. `package.json`, `package-lock.json`, and `.env.example` are all byte-identical to this report's baseline (`git diff` empty) — no new dependencies, no new environment variables, no new secrets, no new deployment target, no new external service. Everything in this report remains accurate as-is; no new discovery cycle was needed. The one open item is unrelated to discovery: the Story 4.1 implementation (code + docs) is not yet committed to git, so the "Git Repository" section below (last updated 2026-09-18, working tree clean at that time) is currently stale with respect to commit state — see `docs/status.md` Upcoming.

---

## Deployment Model

**Target**: **Vercel** (serverless PaaS, Git-based deployment)

This was chosen over a full cloud-provider Terraform/IaC build (Azure/AWS/GCP) because:
- `docs/architecture/design/00-system-architecture-greenfield.md` already specifies "Hosting: Vercel or equivalent" as the intended target.
- The app has no database, no cache, no message queue, and no external service dependencies (Epic 3 retired the only external dependency, the Claude API) — none of the infrastructure modules this framework's discovery questionnaire targets (VPC/VNet, Key Vault, App Service, Container Registry, etc.) apply.
- Vercel manages its own hosting, CDN, build pipeline, and preview deployments — there is no Terraform-managed infrastructure to define.

As a result, this report **intentionally skips** the standard cloud-IaC discovery sections (infrastructure naming, VPC/subnet/resource-group parameters, per-module configuration for database/cache/queue/storage/WAF/Key Vault/etc.) — none of it is applicable to a Vercel target. Only the sections relevant to a Git-based PaaS deployment are covered below.

---

## Auto-Detected Application Profile

| Item | Value |
|---|---|
| Language | TypeScript |
| Framework | Next.js 13.5.11 (App Router) |
| Package manager | npm (`package-lock.json` present) |
| Node version | Not pinned via `.nvmrc`/`engines` — Vercel will use its default Node LTS unless specified |
| Build command | `npm run build` |
| Start command | `npm run start` (not used by Vercel directly — Vercel builds and serves the app itself) |
| Test command | `npm test` (vitest) |
| Lint command | `npm run lint` (eslint) |
| Typecheck command | `npm run typecheck` (tsc --noEmit) |
| Database | None |
| Cache / Queue / External services | None |
| Existing Docker/Compose | None — not needed for Vercel |
| Existing CI (`.github/workflows/`) | None (to be created — see CI/CD below) |
| Environment variables (`.env.example`) | `TRUSTED_PRODUCT_DOMAINS` (optional; defaults to `amazon.com` in code if unset) |
| Secrets required | **None currently** — the only secret ever used (`CLAUDE_API_KEY`) was retired in Epic 3 when the AI-based recommendation engine was replaced by the bundled gift catalog |
| Health check endpoint | `GET /api/health` → `200 {"status":"ok"}` |

---

## Git Repository

- **Status at session start**: No git repository existed.
- **Action taken**: Initialized locally this session (`git init`), added a `.gitignore` covering `node_modules/`, `.next/`, `coverage/`, `*.tsbuildinfo`, and `.env*` (secrets), then created an initial commit (`d3ce190`, 108 files, working tree clean — verified no secrets or build artifacts were committed).
- **Remote**: Not yet created. Per the user's choice, they will create the GitHub repository and push it themselves; no `git push` was run by the agent.
- **Branch strategy**: `main` → production. Every PR gets an automatic Vercel preview deployment; merging to `main` deploys to production. This matches Vercel's default GitHub integration behavior — no separate staging branch/environment requested.

---

## Service Interdependency

Single application, no service dependencies. No dependency graph is needed — there is exactly one deployable unit (the Next.js app itself, frontend + backend API routes together, which is already how Next.js works and satisfies rule T9/DN5's "single app module" requirement trivially).

---

## CI/CD

**Requested**: Yes — a GitHub Actions CI gate (this workflow's job is discovery only; the actual workflow file(s) are built in `aire-devops-pipeline`, the next step).

**Scope for the CI workflow** (to be built next):
- Run on every PR and push to `main`: `npm run lint`, `npm run typecheck`, `npm test` (with coverage), `npm run build`
- **Secret scanning** (gitleaks) — auto-included, free, no config
- **SAST**: CodeQL (free for GitHub, no external account/token needed)
- **SCA (dependency scanning)**: Dependabot (GitHub-native, free, auto-PRs for vulnerable dependencies) — configured via `.github/dependabot.yml`, not a workflow step
- **Deployment itself is NOT part of this GitHub Actions workflow** — Vercel's own GitHub App integration handles build + deploy directly (PR previews + production on merge to `main`) once the repo is connected in the Vercel dashboard. The CI workflow is a quality/security gate that runs alongside it, not a replacement for it.

**Explicitly declined**: SonarQube/SonarCloud/Semgrep (SAST alternatives), Snyk (SCA alternative), OWASP ZAP (DAST) — CodeQL + Dependabot + gitleaks judged sufficient for this MVP's risk profile.

---

## Domain & DNS

- **Decision**: Use Vercel's default `<project>.vercel.app` subdomain for now. No custom domain requested.
- Per DNS rule (DNS is always configured manually, never automated by this agent): if a custom domain is added later, Vercel will surface the exact `A`/`CNAME` records needed in its dashboard at that time — no action needed from this agent until that happens.

---

## Environment Variables (to configure in Vercel Project Settings)

| Variable | Required | Notes |
|---|---|---|
| `TRUSTED_PRODUCT_DOMAINS` | No | Optional; defaults to `amazon.com` in code if unset. Set only if the trusted product-link domain allowlist needs to differ from the default. |

No secrets are required for this app to run in production — this is a direct consequence of Epic 3 retiring the only external, credentialed dependency (the Claude API).

---

## Monitoring & Observability

- **Decision**: Rely on Vercel's built-in deployment logs and analytics for now. No third-party monitoring (Datadog/Grafana/etc.) requested.
- **Health check**: `GET /api/health` is already implemented and can be used for any future uptime-monitoring integration.

---

## Out-of-Scope Confirmation

Per the DevOps rulebook, the following remain out of scope regardless of deployment target and were not discussed further since they don't apply here: Storage Queues, Private Endpoint: Queue, ADF Diagnostic Settings, Logic Apps, Private DNS Zones (none requested).

---

## Next Steps

1. **`aire-devops-pipeline`** — build the actual `.github/workflows/ci.yml` (lint/typecheck/test/coverage/CodeQL) and `.github/dependabot.yml`, matching the scope above.
2. User creates the GitHub repository and pushes the existing local commit (`git remote add origin <url> && git push -u origin main`).
3. User connects the GitHub repo to Vercel via the Vercel dashboard (one-time, manual — Vercel then handles all future deploys automatically on push/PR).
4. If/when a custom domain is added later, Vercel will surface the exact DNS records to configure manually.

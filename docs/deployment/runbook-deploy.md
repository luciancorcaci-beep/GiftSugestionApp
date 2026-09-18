# Runbook: Deploy

**Platform**: Vercel (Git-integrated, no manual build/upload step)

## One-time setup (not yet done — user action)

1. Create a GitHub remote and push this repo:
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. In the [Vercel dashboard](https://vercel.com/new), import the GitHub repository.
   - Framework preset: Vercel auto-detects **Next.js** — no override needed.
   - Build command: default (`next build`, matches `npm run build`).
   - Output: default (`.next`).
   - Root directory: repo root (no monorepo nesting).
3. Environment variables (Project Settings → Environment Variables): none required. Optionally add `TRUSTED_PRODUCT_DOMAINS` if the default (`amazon.com`) needs to change — see `docs/deployment/pipeline-secrets.md`.
4. Recommended: Project Settings → Git → enable **"Wait for CI to pass before deploying"** once the GitHub Actions workflow (`.github/workflows/ci.yml`) is live on the remote, so a failing lint/test/build cannot reach production.

## Routine deploy (after setup)

Deployment is automatic — there is no manual deploy command to run.

| Action | Result |
|---|---|
| `git push` to a feature branch, then open a PR | Vercel builds a **preview deployment** and posts its URL as a PR check/comment |
| Push another commit to the same PR branch | Preview deployment updates automatically |
| Merge the PR to `main` | Vercel builds and promotes a **production deployment** automatically |

## Verifying a deployment

```bash
curl -sS https://<deployment-url>/api/health
```
Expect a `200` with a JSON health payload (see `src/app/api/health/route.ts` for the exact shape). Also manually exercise the golden path: load `/`, submit the gift form, confirm three catalog-backed suggestions render.

## What NOT to do

- Do not run `vercel --prod` or any manual CLI deploy unless intentionally bypassing the Git integration for a hotfix — it skips the PR-preview review step.
- Do not add a `vercel.json` build override unless a real need arises; the framework auto-detection already matches this project's `npm run build`/`next start` scripts.

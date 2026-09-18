# Deployment Quick Reference

| Question | Answer |
|---|---|
| Where does this deploy? | Vercel, Git-integrated (no manual deploy command) |
| How do I deploy? | `git push` → merge to `main` for production, open a PR for a preview. See `runbook-deploy.md`. |
| How do I roll back? | Vercel dashboard → Deployments → pick a healthy prior build → **Promote to Production**. See `runbook-rollback.md`. |
| What secrets do I need? | None. See `pipeline-secrets.md`. |
| What's the health check? | `GET /api/health` |
| Where's the CI config? | `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/dependabot.yml` |
| Why is `dependency-audit` red in CI? | Known, tracked `next@13.5.11` CVEs; non-blocking on purpose. See `pipeline-secrets.md` §Known Issue. |
| Is there a database? | No — recommendations come from bundled `src/data/giftCatalog.json`. |
| Something's broken, where do I look? | `runbook-troubleshoot.md` |
| Full architecture picture | `architecture.md` |
| Full deployment plan/rationale | `deployment-plan.md` |

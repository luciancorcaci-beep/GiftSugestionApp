# Runbook: Rollback

**Platform**: Vercel — rollback is a dashboard action, not a redeploy or `git revert`.

## When to roll back

A production deployment (on `main`) is misbehaving (e.g., 500s on `/api/gift-suggestions`, broken UI, elevated error rate in Vercel's function logs) and the fix is not yet ready to ship forward.

## Steps

1. Go to the project in the Vercel dashboard → **Deployments** tab.
2. Find the last deployment known to be healthy (each entry is tied to a specific commit SHA and shows its build/deploy timestamp).
3. Open its `...` menu → **"Promote to Production"**.
4. Confirm. This re-points the production domain (`<project>.vercel.app`) at that immutable prior build — no rebuild, effectively instant (seconds).

## After rolling back

1. Verify: `curl -sS https://<project>.vercel.app/api/health` returns `200`, and manually re-check the golden path (submit the gift form, confirm suggestions render).
2. Investigate the root cause on a feature branch / PR (which gets its own preview deployment to validate the fix) rather than pushing directly to `main`.
3. Once the fix is verified in a PR preview, merge to `main` to move production forward again — Vercel does not need to be told to "un-rollback"; the next `main` push simply becomes the new production deployment.

## Notes

- Every deployment Vercel has ever built (production or preview) remains available to promote — there is no fixed retention window to worry about for a project this size.
- This mechanism does not touch the Git history — no `git revert`/`reset` is required to roll back what users see in production. Fix the code with a normal forward commit once ready.

# CI/CD Setup

## What

Added `.github/workflows/ci.yml` running on every push and PR to `main`.

Two jobs:

1. **Lint & Test** — `npm ci`, `npm run lint` (advisory), `npm test` (vitest, blocking).
2. **Build** — `npm ci`, `npm run build` against dummy env values. Runs only after the test job passes.

## Why

The repo already had 8 vitest test files (54 tests) but no automation enforcing them. Without CI, regressions land silently and reviewers can't trust that `main` is green.

Vercel handles deploys, so this workflow is intentionally test+build only — no deploy step. The build job exists separately so a failed `next build` (typecheck, page-data collection) blocks merge before Vercel sees it.

## Decisions and trade-offs

- **Lint is `continue-on-error: true`.** The codebase carries 282 pre-existing ESLint errors (mostly `react-hooks/*` and `@typescript-eslint/no-require-imports` in legacy files like `migrations.js` and `components/ai-elements/*`). Making lint blocking would gate every PR on a cleanup that's out of scope here. Lint output still appears in the job log as a signal; it just doesn't fail the run. When the backlog is cleared, flip this back to blocking.
- **Tests are blocking.** Vitest is fast (~280 ms) and the suite is green today, so we hold the line on regressions.
- **Build runs with dummy env.** `next build` reads env at build time for some routes (Supabase clients, etc.). Verified locally that placeholder values let the build complete; no real secrets need to be in repo secrets for CI to pass. Real values are only needed at runtime on Vercel.
- **`needs: test` on the build job.** Saves CI minutes — no point burning a build run if tests already failed.
- **Node 20.x** matches `engines.node` in `package.json`.
- **`npm ci`** (not `npm install`) — deterministic installs from `package-lock.json`, the standard for CI.

## How to apply

- New tests in `__tests__/*.test.ts` are picked up automatically by `vitest run`.
- If a PR adds a new required env var that `next build` reads at build time, add it to the `env:` block of the `build` job with a dummy value.
- To re-enable blocking lint: remove `continue-on-error: true` from the Lint step. Run `npm run lint -- --fix` first to clear auto-fixable issues, then triage the rest.
- Deploys remain on Vercel's GitHub integration; this workflow does not push artifacts or call Vercel.

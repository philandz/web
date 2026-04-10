# Philandz Web

Identity-first Next.js frontend for Philand UI v2.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:9000
```

## Developer commands

- `npm run dev` - run local dev server
- `npm run lint` - run lint checks
- `npm run test` - run unit/component tests
- `npm run build` - validate production build

## Architecture docs

- Structure and boundaries: `docs/architecture.md`
- Testing strategy and examples: `docs/testing.md`
- i18n conventions: `i18n/README.md`

## CI/CD

- PR checks run via `.github/workflows/ci-pr.yml` on `develop`, `sandbox`, and `main` PRs.
- Release CD runs via `.github/workflows/release-main.yml` on push to `main`.
- Release workflow expects these repository secrets:
  - `GH_REPO_PAT`
  - `HARBOR_HOST`
  - `HARBOR_USER`
  - `HARBOR_PASS`

## Core conventions

- Locale-first routes: all product routes are under `/[locale]/...`
- Service and data logic stay out of UI components
- Shared UI primitives go in `components/ui` or `components/form`
- Domain behavior belongs to `modules/<domain>`
- API calls are centralized through `lib/http/client.ts`
- Error capture and sanitization are centralized in `lib/observability/*`

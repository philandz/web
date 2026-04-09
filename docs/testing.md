# Testing Guide

## Current setup

- Runner: `vitest`
- Component environment: `jsdom`
- RTL matcher setup: `test/setup.ts`

Run tests:

```bash
npm run test
```

## Test structure

- Co-locate tests near source files when practical.
- Use `*.test.ts` for pure logic and `*.test.tsx` for components.
- Keep tests focused on behavior, not implementation details.

## Existing baseline tests

- `modules/auth/route-guards.test.ts`
  - post-login redirects
  - dashboard/admin access rules
- `lib/observability/sanitize.test.ts`
  - sensitive key/value redaction
  - nested payload truncation
- `lib/form-errors.test.ts`
  - server field error mapping
  - fallback messaging behavior
- `components/state/page-error-state.test.tsx`
  - alert semantics
  - optional action rendering

## Critical flow test recommendations

Prioritize these next:

1. Auth flows
   - login success + redirect decisions by role
   - session expiry behavior and login notice
   - reset-password happy/error paths
2. Organization selection
   - no-org empty state
   - selected org persistence and route gating
3. API error behavior
   - 401/403 handling through auth handlers
   - 422 field mapping into forms
4. i18n behavior
   - locale route handling and switcher persistence
   - key screen rendering in both `en` and `vi`
5. Theme behavior
   - mode persistence from storage
   - semantic token rendering in core layout

## Suggested test pyramid

- Unit tests (high): guards, parsers, mappers, sanitizers
- Component tests (medium): reusable state/form components
- End-to-end tests (targeted): login, org selection, profile update, admin access

# Philand UI v2 Architecture

This document is the source of truth for frontend structure and boundaries.

## Folder structure

- `app/`: route entries, layouts, loading/error boundaries
- `components/`: reusable presentational UI
  - `components/ui`: low-level primitives (button, input, card)
  - `components/form`: form-oriented primitives with label/hint/error behavior
  - `components/state`: shared loading/error/empty/toast states
- `modules/`: domain logic (auth, tenant, permissions, guard decisions)
- `services/`: backend API mapping per domain (transport and DTO transforms)
- `lib/`: cross-domain infrastructure
  - `lib/http`: API client and normalized API error model
  - `lib/observability`: reporting abstraction and sanitization
  - `lib/auth-store.ts`: global auth/session state
- `providers/`: app-wide provider wiring (query, theme, global handlers)
- `i18n/`: locale routing and message loading configuration

## Responsibility rules

- Routes (`app/*`) compose screens; they do not own backend contracts.
- Services (`services/*`) call the API client and normalize server payloads.
- Modules (`modules/*`) own domain decisions and orchestration logic.
- Shared components render UI; they do not make API calls directly.
- Infrastructure code (`lib/*`) must be domain-agnostic.

## Service / hook / UI separation

- **Service**: `services/identity-service.ts`
  - Request/response mapping only
  - No React code
- **Hook**: `modules/auth/hooks.ts`
  - React Query orchestration
  - Store sync and lifecycle handling
- **UI**: `app/[locale]/**/page.tsx` and `components/**`
  - Rendering and user interaction only
  - Calls hooks, never raw `fetch`

## Shared component rules

- Prefer `components/form/*` for labeled inputs and validation text.
- Prefer `components/state/*` for loading/error/empty UX consistency.
- Keep shared components stateless unless behavior must be reusable.
- Add new primitives only when used by multiple screens.

## i18n rules

- Keep all user-facing text in `locales/<locale>/*.json`.
- Use domain namespaces (`auth`, `dashboard`, `admin`, `common`).
- Do not hardcode visible strings in page/component files.
- Route-aware locale behavior is configured in `i18n/routing.ts` and `middleware.ts`.

## Theme rules

- Theme mode is managed globally by `providers/app-providers.tsx`.
- Use semantic classes/tokens (`bg-background`, `text-foreground`, etc.).
- Avoid hardcoded color hex values inside components unless intentional brand styling.

## Error handling conventions

- API errors are normalized into `ApiError` via `lib/http/errors.ts`.
- Forms should use `applyServerValidationErrors` for field-level mapping.
- Route boundaries (`app/**/error.tsx`) should display shared state and report through observability.
- Do not expose raw tokens/passwords in logs; observability sanitization is required.

## Server vs client component rules

- Default to Server Components for layouts/static data.
- Add `"use client"` only when using hooks, browser APIs, or mutable client state.
- Keep provider wiring and browser event listeners in client-only files.
- Place server-only logic outside client components to avoid accidental bundle growth.

## AI-agent friendliness notes

- Keep file names explicit about role (`use-tenant-context.ts`, `route-guards.ts`).
- Keep one primary responsibility per file.
- Avoid hidden side effects; centralize them in hooks/providers.
- Add small architecture notes in docs when introducing a new subsystem.

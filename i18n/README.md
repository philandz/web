# i18n Architecture

- Routing and locale policy are defined in `i18n/routing.ts`.
- Request-time message loading is in `i18n/request.ts`.
- Domain-split dictionaries live in `locales/<locale>/*.json`.

Key conventions:

- Use semantic, domain-oriented keys like `auth.login.title`.
- Keep shared labels in `common.json`.
- Keep page/feature text in domain files (`auth.json`, `dashboard.json`, `admin.json`).
- Avoid hardcoded user-facing text in components.

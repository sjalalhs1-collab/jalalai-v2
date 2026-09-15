# Search Visibility Policy

Index only the public marketing entry points. Keep authenticated application routes and internal endpoints out of search using authentication, `noindex`, canonical controls, and a restrictive sitemap. `robots.txt` is an indexing hint, not an access-control mechanism.

Recommended public routes:
- `/`
- `/pricing.html`

Recommended private/no-index routes:
- `/app`
- `/projects/*`
- `/files/*`
- `/vault/*`
- `/settings/*`
- `/api/*`

# Website language

English is the default when no valid language preference exists, regardless of
the browser's preferred language. The header's gold dropdown selects English or
Español and displays the active choice. A first-party `site-language` cookie
remembers that non-sensitive preference for a year (SameSite=Lax, Secure on HTTPS).
Clearing cookies restores English. JavaScript is required to change the selection.

The small external header script reloads the current URL after a selection, so
the page, gallery pagination, and URL fragment are preserved. No translation
service, account, API key, or new dependency is used. The existing CSP is unchanged.
Header menus support keyboard operation, Escape, and outside-click dismissal.

`src/lib/translations.mjs` contains authored English and Spanish text. Navigation,
page copy, metadata, accessibility labels, dates, and gallery controls follow the
selected language. Both daily-verse panels retain their original languages and
texts. The ministry/platform names, Bible translation names, and published YouTube
video titles are retained; choosing a language does not switch YouTube channels.

Server components read the preference on each request. Personalized HTML must
remain private/dynamic; never put a visitor's selected language in a shared cache.
Public YouTube metadata retains its separate hourly cache. Add both translations
when introducing new user-facing text.

With a local server running, verify using:

```powershell
node scripts/verify-site-language.mjs http://localhost:3100
```

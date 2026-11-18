# Gospel reader

The reader uses server-rendered GET forms and links with local Bible data.
No new service, credentials, packages, database, or environment variables.
The full corpora stay on the server; only displayed passages go to the browser.

Search examples: `John`, `John 3`, `John 3:16-18`, `John 3:16,18; Romans 8:28`,
`John 3:36-4:2`, `Salmo 23`, `amor`, and `"God so loved"`.
English/Spanish book aliases work in either language. Word searches use all
words (accent/case insensitive); quoted phrases must appear together. Results
are in canonical order, 40 per page. Reference searches return at most 500 verses.
Searching a book opens its first chapter; chapter links open the rest.
Context recommendations link to the first three chapters represented in results.

The shared language cookie selects KJV or Reina-Valera 1909. Daily cards are normal links
to `/gospel/open`, which validates the reference, sets the language cookie, and
redirects only to `/gospel`. It is not prefetched or shared-cached. Search pages
are request-rendered to prevent language leakage between visitors.

Highlights are character offsets in `sessionStorage`, separately keyed by
edition. Spanish uses a new storage key so old NBV highlight offsets cannot
apply to RV1909 text. They survive navigation/reload in the same browser tab and are
normally removed when that tab's session ends (browser session restoration may
restore them). Clear highlights removes the current translation's highlights.
Nothing is uploaded. Storage values are validated and never interpreted as HTML.
Limit: 500 passages, 100 selections each, 200 KB per translation. Blocked storage
falls back to in-page highlighting with a visible status message.

Native external JavaScript preserves the existing strict CSP: no inline scripts,
eval, new origins, or React hydration requirement. Search/reading work without JS;
highlighting and the chapter input's automatic maximum need JS.

Validation: `npm run test:bible`, `npm run lint`, `npm run build`.
Review locally before committing or deploying to main.

Browser verification on 2026-11-17 covers `next start`: search, individual verses,
multi-passage input, highlight persistence across reload/chapter navigation,
language isolation, both daily-card redirects, invalid inputs, 390px layout, and
reading without JavaScript. Preview screenshots and browser harness are in the
workspace's `outputs` directory, outside this repository.

The small ministry label, introductory sentence, and edition badge sit above the full-width
search panel; there is no large title or right-hand introduction. Thicker gold
panel borders and separators are scoped to Gospel; other pages keep their styles.

The existing site-wide CSP blocks Next.js inline hydration scripts. In Next 16.4.6
development this also produces a `self.__next_r` request-ID console error. Gospel
features still passed, but the clean browser verification uses the production-style
local preview (`npm run build`, then `npm run start -- --port 3100`). No CSP change
was made for this feature. Production preview has no page runtime errors.

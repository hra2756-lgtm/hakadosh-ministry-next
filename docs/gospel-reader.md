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

The shared language cookie selects BSB or La Biblia en Español Sencillo. Daily cards are normal links
to `/gospel/open`, which validates the reference, sets the language cookie, and
redirects only to `/gospel`. It is not prefetched or shared-cached. Search pages
are request-rendered to prevent language leakage between visitors.

Highlights are character offsets in `sessionStorage`, separately keyed by
edition. Both editions use new storage keys so earlier KJV/RV1909 highlight offsets
cannot apply to BSB/BES text. They survive navigation/reload in the same browser tab and are
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

## Scripture sharing

Reference results have WhatsApp, X, Instagram, and a camera icon. The camera is
an image download, not access to a device camera. It exports only the reference,
edition, Scripture text, and ministry credit in parchment/gold styling. It does
not capture menus or controls. Downloaded photos include visible session highlights;
these are rendered locally in the browser, never sent to the image endpoint.

WhatsApp and X share an absolute production URL at `/gospel/share?lang=...&q=...`.
This public server-rendered page preserves the full passage and explicitly selects
BSB or BES independently of cookies, so crawlers receive the correct edition.
It includes Open Graph and X large-image metadata. Open in the Gospel reader sets
the language cookie and opens the same reference. Share pages are noindex.

`/gospel/share/image` uses Next's included ImageResponse to generate PNGs without
new packages or credentials. Only validated local Bible passages are accepted;
arbitrary text, remote URLs, keyword searches and invalid languages are rejected.
Image URLs include an edition marker so older translation images are not reused.
Public preview images stay 1200×630; camera and Instagram downloads are 1080×1920
(9:16) on desktop and mobile, with the ministry logo and www.hakadoshministry.com.
The browser renders text and marked ranges with Canvas; the no-JavaScript fallback
uses the server portrait route without personal highlights.
Long passages use readable, explicitly labelled excerpts, while shared links keep
the full passage. No AI-generated or paraphrased Scripture text is used.

Instagram uses native file sharing when the browser supports it; the visitor picks
Instagram if it is offered by their device. It cannot automatically attach an
image to Instagram's web composer. Unsupported devices download the PNG and show
instructions to attach it manually. Cancellation performs no fallback download.
Without JavaScript, Instagram and camera both remain ordinary download links.

Local verification covers PNG responses/downloads, bilingual metadata, cookie
isolation, reader redirects, native-sharing success/cancel and download fallback,
invalid image inputs, and narrow mobile layouts. Actual WhatsApp/X preview fetching
requires a public deployment and remains subject to platform caching/settings.
Do not claim those platforms displayed a preview based only on localhost tests.

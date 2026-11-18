# Local blog and Sanity Studio

Project: `2a3jhsqe`. Studio has separate **development** and **production** workspaces.
The existing public `production` dataset was verified on November 15, 2026; it had
no published posts. No content was copied or published during configuration.
The local website still defaults to **development**; Vercel needs an explicit dataset.

## Start locally (PowerShell, Node 22.12+)

From the repository directory, open two terminals:

```powershell
npm.cmd run dev
```

Website: http://localhost:3000/blog (or the port printed by Next.js).

```powershell
npm.cmd run studio
```

Editor: http://localhost:3333. Sign in using the same provider/account that owns
the Sanity project. Studio is a separate application; it does not weaken the
website's Content Security Policy. It binds to localhost, not the LAN.
The schema is local code; content is saved in Sanity's cloud even during local development.

Use the workspace switcher next to the Studio title to choose:
- **Development (Testing)**: http://localhost:3333/development
- **Production (Live posts)**: http://localhost:3333/production

Both workspaces use the same post schema but independent content. Publishing in
Production makes the document publicly queryable immediately; it appears on the
website once that deployment is configured for `production`. Development posts
are not copied automatically. The CLI default remains `development`; specify the
workspace/dataset explicitly for production operations.

For a new checkout, run `npm.cmd ci` and `npm.cmd --prefix studio ci` first.
Studio dependencies have a separate lockfile and are not installed in the public
Next.js application. No public-site write token is needed or accepted.

If Studio asks to add a CORS origin, use the project's Sanity management page:
API → CORS origins → add **http://localhost:3333**, allowing credentials for
Studio login. Do not use `*`. The public website fetches server-side and does
not need a credentialed localhost:3000 CORS entry. Only configure the origin
if Sanity reports it missing; the login screen alone does not mean CORS is wrong.

## First post

### Automatic Scripture links

Write references normally in the post body, for example `John 3:16`,
`Juan 3:16–18`, `Psalm 23`, or `1 Cor. 13:4–7`. The website automatically
links recognized, valid passages to its Gospel reader. References may be bold,
italic, or split across formatting spans. Existing manually added links are
preserved. Separate named references each get their own link; numeric lists
such as `John 3:16,18` share one link.

The post's actual content language selects KJV or RV1909, including when the
website displays a fallback translation. Clicking the link also switches the
website language accordingly. Both existing and future posts benefit without
editing the Sanity documents or redeploying Studio. No additional provider or
credentials are needed. This does not translate or rewrite author content.

Detection requires a recognized book name/abbreviation and chapter, optionally
with verse numbers or ranges. Unnamed quotations, ambiguous prose, invalid
references, URLs and unsupported notation remain unchanged. Automatic links are
limited to 240 characters and 500 verses. The reader accepts up to 1,000
characters for valid references so expanded full book names can be resubmitted;
word searches remain limited to 240 characters, and references to 20 selections.
Validation runs on the server;
generated links only target the internal Gospel reader and contain no HTML.

### Publishing

1. Choose the intended workspace, open Revelations / Revelaciones and create a document.
2. Write a title and body in at least one language. English and Spanish are
   independently written/reviewed; there is no automatic translation.
3. Generate the page address, select a category, and leave or adjust the date.
4. Optionally add a cover image with description and a YouTube URL.
5. Save as a draft: it must **not** appear at `/blog`.
6. Click Publish, wait about a minute, then refresh `/blog`.
7. Check both website languages and the individual post. If a translation is
   missing, the complete available version appears with a language notice.
8. Unpublish and confirm the post disappears after cache refresh.

The date is a display/sort field, not a scheduling mechanism. Publish is the action
that makes a post public in the selected dataset. Do not put confidential text in
published fields. Published development content is also publicly queryable.
Never upload confidential images/files: normal Sanity dataset assets are accessible
to anyone with the URL, including draft uploads and private-dataset assets.

The reader fetches only published documents, unauthenticated, with a 60-second
cache. A refresh after expiry may first serve the previous cached response while
it revalidates. Normally updates appear in minutes, with no code commit or build.
Provider/network failures can delay updates; the site shows an honest unavailable
message rather than pretending there are no posts.

## Author access and security

- The owner must remain the only project member with editing/publishing privileges.
  Verify Members in Sanity; the website itself cannot enforce your cloud membership.
- Enable MFA on the Google/GitHub account used for Sanity. Do not share the login.
- Keep the dataset public on Free, with unauthenticated read-only public requests.
  Drafts and release versions cannot be read this way; no browser write credentials.
- React renders supported Portable Text as text/elements, never raw HTML.
- Links require HTTPS; video links require a YouTube host. Image references must
  identify a supported raster asset in the configured project/dataset.
- New CDN permission is limited to `/blog` and this project's image path. All
  existing script restrictions remain in place.
- Share links use the eventual canonical public URL. During development those
  links will not open a live post until the post and feature are launched.
- Likes use a separate Upstash Redis database; see `docs/blog-likes.md`.
  Visitor comments and sharing counters are not enabled.

## Before any production launch

This local integration is **not** a completed production rollout.

1. Verify the Free plan, sole-author membership and MFA; test publish/unpublish
   and draft exclusion with a real owner-created sample post.
2. The `production` dataset and separate Studio workspace are configured. Prepare
   the intended live posts there. Never copy test posts into production automatically.
3. Set `SANITY_PROJECT_ID=2a3jhsqe` and `SANITY_DATASET=<exact live dataset>` in
   Vercel Production. Without an explicit dataset, Vercel fails closed and shows
   the unavailable state rather than development posts.
4. Manual Production export and Google Drive desktop copy are implemented; see
   `docs/blog-backups.md`. Confirm cloud upload and complete a separate restore drill.
   No scheduled exports or automatic retention are configured. Exports and tokens
   must not enter the public repository; `/backups/` is ignored as a second guard.
5. Implement a published-only fallback snapshot with independent image copies;
   test a simulated Sanity outage. A cache or a list of CDN URLs is not a backup.
   Website outage fallback and backup automation have not yet been configured.
6. Configure the chosen Studio host/CORS explicitly, review on test, then obtain
   the user's go-live instruction before merging to main.

## Checks

```powershell
npm.cmd run lint
npm.cmd run test:blog
npm.cmd run build
npm.cmd run studio:build
npm.cmd --prefix studio run validate
```

Official references:
- https://www.sanity.io/docs/next-js-quickstart
- https://www.sanity.io/docs/content-lake/keeping-your-data-safe
- https://www.sanity.io/docs/content-lake/exporting-data

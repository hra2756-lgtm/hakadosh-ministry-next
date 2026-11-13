# YouTube galleries

The `test` branch is for review; `main` is production. The navigation starts with
Youtube Spanish and ends with Youtube English. Each page shows full videos on
the left and Shorts on the right, newest publication date first. On phones the
columns stack, with full videos first.

## Run locally on Windows

In Credential Manager → Windows Credentials → Generic Credentials, use:

- Target: `HakadoshMinistry/YouTube`
- Username: `YOUTUBE_API_KEY`
- Password: the YouTube Data API v3 key

From PowerShell in the project folder:

```powershell
npm.cmd run dev
```

Open http://localhost:3000/youtube-spanish or
http://localhost:3000/youtube-english. Use the port printed by Next.js if 3000
is occupied. Stop with Ctrl+C.

The dev/start wrapper reads only this named credential under the current Windows
account and supplies it to Node in memory. It does not print the key, save it to
`.env.local`, or change PowerShell execution policy. An existing process
environment variable `YOUTUBE_API_KEY` takes precedence. On other platforms,
configure that server environment variable directly.

## Vercel preview deployment

Windows Credential Manager is local to this computer. In the existing Vercel
project, add `YOUTUBE_API_KEY` as a Secret environment variable for Preview
(scope to `test` if desired), enter the key privately, and redeploy the preview.
Configure Production separately when ready to release to `main`.
Do not use a `NEXT_PUBLIC_` prefix or commit the key. Enable YouTube Data API v3
and restrict the key to that API in Google Cloud.

## Maintaining the content

Public handles, channel IDs and the four playlist IDs live in
`src/lib/youtube-channels.mjs`. Add each new upload to the corresponding public
playlist on YouTube. Uploads outside these playlists do not appear automatically.
Playlist order is ignored: the site sorts by video publication date. Public
videos belonging to the configured channel are displayed; upcoming, private,
deleted, or other-channel entries are omitted. Videos that disallow embedding
still link to YouTube.

Public metadata is cached for one hour and refreshed when requested after that
interval. The first request during refresh may see the previous result. Cached
data older than 24 hours is not shown during an outage. API errors produce a
friendly message with playlist links. Each column initially shows six items;
Show more adds six independently. A player loads when opened and stops when
closed. The API key stays on the server; Google requests send it in a header,
and only sanitized public results are cached.

## Verification

```powershell
node --test scripts/verify-youtube-data.mjs
npm.cmd run lint
npm.cmd run build
node scripts/with-youtube-key.cjs scripts/verify-youtube-live.mjs
```

The live check uses the saved credential and reports only public playlist data.
To check a running server's responses and key isolation, run:

```powershell
node scripts/with-youtube-key.cjs scripts/verify-youtube-responses.mjs http://localhost:3000
```

# Ministry assistant

Local development uses the loopback Worker. Production is explicitly enabled with
ASSISTANT_ENABLED=true on Vercel Production only; previews remain disabled.
The production endpoint is fixed in code and requires Cloudflare Access service
credentials plus a separate shared bearer secret. Secrets remain server-only.

## Production configuration

Vercel Production: ASSISTANT_ENABLED, ASSISTANT_SHARED_SECRET,
ASSISTANT_ACCESS_CLIENT_ID, ASSISTANT_ACCESS_CLIENT_SECRET, and the existing
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN and Sanity/YouTube configuration.
Cloudflare: matching ASSISTANT_SHARED_SECRET, AI binding, BUDGET Durable Object,
and an Access Service Auth policy scoped to the Vercel service token.

The server allows only the two ministry production origins, validates payloads,
and uses Redis for five requests/minute per keyed network hash with a 60-second
expiry. Raw IPs and chats are not stored. Missing rate storage or trusted Vercel
IP fails closed. The Worker also enforces its aggregate daily/minute budget.
This reduces abuse but is not proof of a human visitor. Monitor quota exhaustion.
Disable ASSISTANT_ENABLED and redeploy to hide the chat and close its API.

## Start

Sibling checkout: `../hakadosh-ministry-assistant`.

1. In the agent checkout: `npm.cmd ci`, then `node scripts/setup-local.cjs`.
   This creates a random local connector secret in both ignored environment files,
   preserving other settings. This is not a Cloudflare API key.
2. Sign in with `npx.cmd wrangler login`. If Cloudflare Access protects the Worker,
   use its normal interactive login with the official `cloudflared` helper.
3. In the agent terminal: `npx.cmd wrangler dev --ip 127.0.0.1 --port 8787`.
4. In the website terminal: `npm.cmd run dev -- --hostname 127.0.0.1`.
5. Open `http://127.0.0.1:3000` and choose **Let's talk / Hablemos**.

AI inference still uses Cloudflare and its daily allowance while the website and
Worker run locally. Do not disable Access protection to work around login errors.

## Sources and honesty

`assistant-data.mjs` retrieves actual BSB/BES text using the existing reference
parser plus a small bilingual topic map and lexical fallback. It supplies up to
six verified verses per request; this is not exhaustive theological retrieval.
The UI constructs exact quotation cards and links from those sources rather than
trusting model-generated Bible text or URLs. Unsupported references/IDs fail closed.

`assistant-knowledge.js` reads published posts from the same dataset as the local
blog (all published posts, paginated; both languages, matching passages), and public video/Short titles from both channels complete upload collections using
cached YouTube APIs. No Sanity read token, drafts or internal files are sent.
There are no video transcripts or external-teacher texts yet. The agent must not
invent their contents. Source text and prior messages are untrusted data.

## Privacy and limits

The browser holds conversation context in memory only (last three exchanges,
2,000 characters/message); refresh, navigation or Clear removes it. No localStorage,
cookies, chat database, conversation IDs, automatic email or personal memory.
The server sends sanitized recent messages and bounded public excerpts to the
authenticated local Worker. Neither app logs message bodies or model exceptions.
Worker observability and AI Gateway integration are disabled. Cloudflare still
processes content and may keep technical metadata under its own terms.

Next's local route enforces same-origin JSON requests, bounded streaming bodies,
one in-flight request, and five requests/minute (process-wide, not per-person).
The Worker requires a server-only random bearer secret. Its Durable Object stores
only a single aggregate usage record: UTC day, minute, count and conservative
neuron reservation. It caps 20 calls/minute and 9,000 estimated neurons/day. This
is **not** an exact account-wide meter: other apps use the same free allocation,
and local counters are separate from any deployed counters. No paid plan is enabled.

## Checks

Website: `node --test scripts/assistant.test.mjs`, `npm.cmd run lint`, `npm.cmd run build`.
Agent: `node --test test/protocol.test.mjs`, `npx.cmd tsc --noEmit`.


## Public library retrieval
All published posts are paginated in batches of 100; both translations are searched across their full text. Relevant passages only are sent to the model within existing source-size limits. Exact titles and latest-post intent guide selection. Scripture context also comes from references in the selected post passages. Channel uploads include public videos outside curated playlists. Sanity reads refresh after 60 seconds; channel title caches refresh after one hour. No drafts, tokens for private Sanity access, video transcripts, or write permissions are introduced. Partial upstream failures are reported to the model, never treated as proof that content does not exist.

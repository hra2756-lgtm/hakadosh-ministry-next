# Blog likes

The heart button is on each article. English and Spanish use the same published
Sanity document ID, so they share a total. Visitors can like and undo without an
account. This is browser-based recognition, not proof of one unique person.

## Local setup

Windows Generic Credentials loaded by the existing dev/start launcher:

| Target | Environment variable |
| --- | --- |
| `HakadoshMinistry/UpstashUrl` | `UPSTASH_REDIS_REST_URL` |
| `HakadoshMinistry/UpstashToken` | `UPSTASH_REDIS_REST_TOKEN` |

Store the actual value in each credential's Password field. Matching surrounding
quotes copied from dashboard examples are stripped in memory. Only HTTPS REST
endpoints on `*.upstash.io` with no extra path, credentials, query or port are
accepted. The read/write token stays server-side and is never logged. A read-only
token cannot record likes. Restart `npm.cmd run dev` after changing credentials.

No Sanity write token is used and no Redis SDK dependency is required. Blog text
and images remain in Sanity; Redis stores pseudonymous like membership and brief
rate-limit records. Neither service receives visitors' email addresses from this
feature. No shares are tracked.

## Integrity and privacy

- Each post has a Redis set of pseudonymous browser identifiers. Its cardinality
  is the displayed count. Atomic Lua `SADD` / `SREM` operations make repeated
  requests idempotent and avoid lost increments or negative counts.
- The server accepts only `{ "liked": true }` or `{ "liked": false }` for an
  existing published post. Requests cannot provide a count, key, command or user ID.
- A signed, HttpOnly, SameSite=Lax cookie remembers the browser for up to one year;
  it is Secure on HTTPS. Its signing key is derived with a separate HMAC context
  from the private Redis token and environment namespace. Rotating that token
  invalidates recognition: totals remain, but old choices cannot be undone from
  the new identity. Use a planned migration if preserving identities is necessary.
- Clearing cookies, using another browser or forging many legitimate sessions can
  produce additional likes. This is not an authenticated voting system.
- Read/write responses are private and no-store. The browser reads once per page
  load and after an uncertain failure; there is no background polling. Other
  visitors' likes appear on refresh, not through a live subscription.
- POST requests require same-origin JSON, a valid signed cookie, a tiny bounded
  request body, and a valid post. Cross-site requests are rejected.
- Vercel's `x-vercel-forwarded-for` supplies the rate-limit IP; incoming forwarding
  headers are ignored on localhost. Redis stores an HMAC of the IP, never the raw
  IP. Rate buckets expire after 60 seconds, with 120 reads and 30 writes per minute
  per network address. People on a shared network share that allowance.
- Application limits do not prevent all distributed abuse or eliminate command
  costs for rejected requests. Review Vercel edge protection before launch and
  monitor Upstash quotas. No firewall settings were changed by this implementation.
- Each request normally uses two REST calls: a rate check and a read/change script.
  Commands executed inside scripts also consume quota; do not equate request count
  with billed command count. Failures show an unavailable state, not a fake zero.

## Environment separation

Redis keys begin with `hm:likes:v1:<stage>:<projectId>:<dataset>`.
Stages are `local`, `preview`, and `production`. This keeps local testing and
Vercel previews out of production totals. Namespaces are logical separation, not
separate security boundaries: a token for this database can access all its keys.
Like membership persists until removed; short-lived rate buckets expire.

Before a production rollout, add the two Upstash variables to Vercel Production
and explicitly configure the live Sanity dataset. Do not prefix token variables
with `NEXT_PUBLIC_`. Include likes storage in the backup/recovery plan and review
the public privacy wording for the functional cookie. No deployment was performed.

## Verification

`npm.cmd run test:blog` covers signatures, expiry, environment separation, request
validation, published-post restrictions, idempotence, rate limits and secret-safe
errors. It uses an in-memory fake transport and never contacts a real database.

For an explicit local real-database smoke check:

```powershell
node scripts/with-youtube-key.cjs scripts/verify-likes-storage.mjs
```

This tests simultaneous duplicate likes, two visitors and undo in unique temporary
keys, then deletes only those verification keys. It never alters actual post totals.

References:
- https://upstash.com/docs/redis/features/restapi
- https://upstash.com/blog/lua-scripting-on-upstash-redis-atomic-operations-over-http
- https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for

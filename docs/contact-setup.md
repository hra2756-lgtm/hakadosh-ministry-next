# Connect with Us

The `/contact` page is bilingual and appears after Blog in the menu. Instagram is on the left and X is on the right; they stack on phones. The email card opens the visitor's email application. The form sends through the server to `hriver2756@hakadoshministry.com`; visitors cannot change that recipient.

## Activate sending

1. Create a [Resend account](https://resend.com/signup). Add and verify the sending subdomain `contact.hakadoshministry.com` in Domains. This domain's DNS is managed in Squarespace (Google nameservers), while Vercel hosts the website. In Squarespace's DNS settings, add the exact sending DNS records shown by Resend. Keep the existing root-domain email records. Receiving through Resend is not needed. Domain verification and real localhost inbox delivery were confirmed by the owner on November 13, 2026.
2. Create a Resend API key with **Sending access**, scoped to this verified domain. The default sender is `website@contact.hakadoshministry.com`. `CONTACT_FROM_EMAIL` can override it with another verified address under the ministry's domain.
3. Create a [Cloudflare Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/) in Managed mode. Cloudflare DNS hosting is not required. The local widget allows `localhost` and its keys stay in Windows Credential Manager. Create a separate live widget allowing `hakadoshministry.com` (which also covers `www.hakadoshministry.com`). Keep pre-clearance disabled. For test Preview, allow the exact project branch-preview hostname as well, or use a separate preview widget. Never allow all of `vercel.app`. Copy the site key and secret key privately.
4. Add the three variables below in Vercel Project Settings → Environment Variables for the test Preview and, when ready, Production. Redeploy for them to take effect. Keys must never be committed or pasted into chat.

| Environment variable | Windows Generic Credential target | Visibility |
| --- | --- | --- |
| `RESEND_API_KEY` | `HakadoshMinistry/Resend` | Secret, server only |
| `TURNSTILE_SECRET_KEY` | `HakadoshMinistry/TurnstileSecret` | Secret, server only |
| `TURNSTILE_SITE_KEY` | `HakadoshMinistry/TurnstileSite` | Public widget identifier |

For localhost: Windows Credential Manager → Windows Credentials → Add a generic credential. Use the target above as Internet/network address, the variable name as username, and the corresponding key as password. Restart `npm.cmd run dev`. The existing launcher reads only these named entries plus the YouTube key; credentials stay in process memory. Missing contact credentials do not prevent YouTube or the rest of the site from running. Environment variables supplied by the process take precedence.

The form remains unavailable until all three keys exist. Merely adding keys does not prove domain verification or delivery: confirm a real submission in Resend and the ministry inbox once configuration is complete. A successful API response means accepted for sending, not guaranteed inbox delivery.

## Protections and operational limits

- Only approved site origins and exact Vercel project deployment/branch URLs can post. Local origins are accepted only on a local server outside Vercel.
- JSON-only POST, bounded 32 KB body, server validation, topic allowlist, honeypot, and mandatory server-verified Turnstile hostname/action. Turnstile tokens expire and are single use; no bypass exists for production.
- Fixed recipient/sender, validated reply-to, plain-text email, provider timeout, idempotency key, and sanitized responses. No messages, tokens, or provider errors are logged by the handler or saved to a site database. Resend and the ministry mailbox process/retain messages under their own settings.
- Only the contact route permits Cloudflare scripts/frames. The existing prohibition on inline scripts stays in place. No new npm packages are required.
- Turnstile is bot protection, not a hard sending quota. Before public rollout, configure a Vercel Firewall rate-limit rule for POST `/api/contact` (for example 5 requests per IP per 10 minutes, tuned for legitimate usage), review Resend quotas/alerts, and check spam activity. There is no misleading in-memory rate limit that resets independently on each serverless instance.
- Real challenge completion and inbox delivery remain external setup checks. Unit tests use fake transports and send no emails.

Validation: `npm.cmd run lint`, `npm.cmd run build`, `node --test scripts/contact.test.mjs`, and `node scripts/verify-site-language.mjs http://localhost:3100` against the local server.

References: [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction), [Send Email API](https://resend.com/docs/api-reference/emails/send-email), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Turnstile CSP](https://developers.cloudflare.com/turnstile/reference/content-security-policy/), [Squarespace DNS](https://support.squarespace.com/hc/en-us/articles/360002101888-Edit-your-domain-s-DNS-records).

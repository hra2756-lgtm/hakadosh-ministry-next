# Temporary picomatch mitigation

Advisory: https://github.com/advisories/GHSA-fc5q-39xc-vjpf
Reviewed 2026-11-17. At review time the latest published version is 4.0.7,
and the advisory lists no patched release. The Gospel work did not introduce
or upgrade this dependency. Website copies come through lint tooling; Studio
copies come through CLI/build tooling.

## Scope and tradeoff

`scripts/patch-picomatch.cjs` adds a linear scan to the installed parser's
`analyzeRepeatedExtglob`. If a repeated `+(...)` or `*(...)` group contains an
unescaped asterisk, it uses picomatch's existing escaped-literal fallback.
That prevents the nested wildcard repetition described by this advisory.
The guard also applies when callers set `maxExtglobRecursion: false`.

This intentionally changes matching for those patterns: `+(*a)b` now matches
the literal filename `+(*a)b`, not arbitrary wildcard expansions. For a small,
auditable guard, stars in bracket classes or quoted text are also treated
conservatively. Normal `**/*.js` globs, non-repeated extglobs such as
`!(*.d).ts`, simple repeated literal alternatives, and numeric classes remain
supported. This is a mitigation for this advisory, not a claim that arbitrary
regular expressions/globs are safe from every possible denial of service.

The original parser SHA-256 is pinned for each installed version (2.3.2,
4.0.4, 4.0.7). Every locked copy must exist and match the reviewed bytes.
Unexpected versions/source changes fail installation rather than silently
skipping protection. Reapplication is idempotent. Package versions, registry
integrities, and audit findings are not falsified or renamed.

Both projects apply the patch in `postinstall`. `prebuild` verifies the patch,
and CI tests every locked installed copy. Do not install with `--ignore-scripts`
and assume protection exists. After an upstream dependency update, review the
official fix and remove the temporary hooks/tests or deliberately update them;
do not automatically accept a new source hash.

## Validation

Run independently in the website and `studio` directories:

```text
npm ci
npm run test:security-patch
npm run build
```

Before patching, the regression test timed out on both website copies at the
3-second child-process limit. After patching it checks known malicious shapes,
nested/alternative variants, capture/Windows/opt-out options, literal fallback,
and common tooling patterns. Each subprocess has a hard timeout so an
unprotected dependency cannot hang the entire test runner.

Local verification after clean installs: all eight patch checks across the two
projects passed, both production builds passed, lint passed, all 32 application
and backup tests passed, and the Gospel browser checks passed (search, session
highlights, languages, daily links, mobile layout, invalid input, no-JS reading).

## Owner-approved guarded audit exception

The owner approved integrating this policy on `test`/PR #11 on November 17,
2026. This does not authorize merging or deploying production.

Both CI jobs now use `npm run security:audit`. It requires the exact installed
patch, reruns bounded attack/compatibility tests, obtains a fresh full npm audit,
and verifies the patch again before deciding. The complete original audit JSON
remains visible. There is no cached-report, skip-test, ignore-list, or alternate
date option. Network/audit errors and malformed reports block the check.

Only GHSA-fc5q-39xc-vjpf, for the reviewed picomatch package, high severity and
`<=4.0.7` affected range, is accepted with verified protection. Every reported
affected copy must be among the verified installed packages. Dependency-chain
findings must trace solely to that advisory. Any other moderate-or-higher
advisory blocks release, preserving the previous severity threshold.

The exception expires at **2026-11-25 06:00 UTC**, the end of November 24 in
Mexico City. It cannot extend itself. Expiry blocks subsequent checks; it does
not shut down a site already deployed. Any extension requires another review
and owner approval. Once an official fix is available, test that update, remove
the temporary patch/hooks/policy, and restore the ordinary npm audit commands.

This is explicit temporary risk acceptance for a tested local mitigation, not
an official upstream fix or a claim that the raw npm audit is clean. CI prints
`mitigated-with-explicit-temporary-exception` when using the exception. The patch
still has the compatibility and maintenance limitations described above.

Validate the policy with `npm run test:security-audit` from the repository root.
The tests cover other advisories, changed advisory details, missing protection,
expiry, malformed/incomplete reports, cycles, and failed fresh audits.

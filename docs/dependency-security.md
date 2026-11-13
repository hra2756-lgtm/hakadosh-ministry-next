# Release dependency updates

The November 12, 2026 release refreshes dependencies within the existing package
ranges, including Next.js 16.4.6, to address the release audit findings.

There is one targeted development-tool override: `@typescript-eslint/typescript-estree`
8.72.2 requires minimatch ^10.2.2, but that major has no fix for
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
Its minimatch dependency is pinned to patched 11.0.1, which supports the project's
Node 20 CI runtime. This does not override other dependencies' minimatch versions.
Remove the override when typescript-eslint supports a patched version itself.

Validate changes with lint, the production build, the feature verification
scripts, and `npm audit --audit-level=moderate`.

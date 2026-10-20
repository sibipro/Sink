# Dependabot remediation — 2026-10-20

Baseline: `master` at `8c89326`. The 17 open Dependabot alerts cover nine
packages. This change upgrades dependencies for 16 alerts and applies a tested
source patch for the remaining alert.

## Alert coverage

| Alerts | Package | Resolution |
| --- | --- | --- |
| #198, #199, #201, #202, #224 | devalue | 5.9.3 |
| #223 | sharp | 0.35.5, including updated native image libraries |
| #220, #221, #222 | simple-git | 4.0.1 |
| #217 | @vue/server-renderer | Vue runtime, renderer and compilers aligned to 3.5.43 |
| #204, #209, #215 | brace-expansion | 1.1.21, 2.1.7 and 5.0.12, preserving the existing major branches |
| #212 | undici | 6.28.1 |
| #211 | postcss-selector-parser | 7.1.6 |
| #208 | source-map-js | 1.2.2 |
| #216 | node-forge | 1.4.0 with the CVE-2026-85393 source patch below |

The larger lockfile diff primarily replaces two Vue versions with one aligned
version and updates their peer dependency snapshots. Nuxt remains at 3.21.10
and NuxtHub remains at 0.7.11. The 14-day minimum release age is preserved;
all selected security releases satisfy it. The superseded `undici@6.28.0`
release-age exception is removed.

## Temporary dependency patches

### node-forge 1.4.0

`patches/node-forge@1.4.0.patch` applies the `lib/rsa.js` change proposed in
[upstream PR #1152](https://github.com/digitalbazaar/forge/pull/1152), at
commit `ceba34402e329f0365134f23fe19898756527d65`. That PR is open and unmerged
at the time of this change; no fixed npm release is available.

The patch rejects extra children in the nested ASN.1 DigestAlgorithm sequence
during RSA PKCS#1 v1.5 signature verification. `pnpm test:security` verifies
that malformed structures with and without a NULL parameter are rejected,
while valid signatures continue to verify. Both rejection tests fail against
unmodified 1.4.0 and pass with the patch. These tests run before Cucumber in
`pnpm test`, including in CI.

Dependabot and npm audit inspect the package version and will continue to flag
1.4.0. Alert #216 is mitigated locally, not closed. No advisory is suppressed
or dismissed. Once a fixed release is published and verified, upgrade to it
and remove the patch and its `patchedDependencies` entry. Retain the regression
tests while node-forge remains in the dependency tree.

### Nuxt DevTools 3.3.1

[simple-git 4](https://github.com/steveukx/git-js/releases/tag/simple-git%404.0.0)
removes its default export. DevTools 3.3.1 still imports it, causing Nuxt startup
to fail after the security upgrade. `patches/@nuxt__devtools@3.3.1.patch` switches
that import to the supported named `simpleGit` export. Remove this patch after
upgrading DevTools to a release compatible with simple-git 4.

## Validation

- Node 22.22.3 and pnpm 11.1.3, matching the repository configuration.
- Frozen dependency installation and Nuxt preparation pass.
- Four security regression tests pass.
- Eight Cucumber scenarios and 20 steps pass against the local development server.
- Production Cloudflare Pages build passes.
- Sharp renders an SVG through the updated native libraries.
- simple-git can read repository status and rejects trailer commands, config
  includes and abbreviated unsafe push options.
- `pnpm audit --prod --json` reports zero vulnerabilities. Nuxt and much of the
  build/server tooling are declared as devDependencies, so this check alone is
  not a complete assessment of the deployed application.
- The full npm audit decreases from 50 findings to 18: zero critical, eight high,
  nine moderate and one low. The remaining findings also occur on the baseline;
  they include the patched node-forge version and additional advisories for
  micromatch, path-to-regexp, cross-spawn, @eslint/plugin-kit, ajv, yaml, tar,
  braces, Vite and launch-editor. Those additional advisories are outside the
  17-alert Dependabot snapshot addressed here.

Existing lint and typecheck failures are compared against a separate unchanged
baseline checkout. Lint reports the same 196 errors and typecheck reports the
same 28 errors, with no added diagnostics. The changed manifest, regression
test and this report pass their scoped ESLint check. Existing failures are not
resolved by this dependency remediation.

Cloudflare preview deployment tests still require a published branch and the
repository's Preview E2E workflow.

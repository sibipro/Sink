# Nuxt security advisory triage

_Date: 2026-06-17 · Reviewed against `nuxt@3.13.2` (current pin)_

## Background

Every open Dependabot alert against `nuxt` is fixed only by upgrading the
framework (patched versions range from 3.16.0 to 3.21.7). The app is pinned to
`nuxt ~3.13.2` because the attempt to jump to 3.21.7 forced `@nuxthub/core`
0.7→0.10 and took production down (PR #19, reverted in PR #20). So none of these
will auto-clear without an upgrade, and the upgrade itself is a deferred,
preview-validated effort.

This triage assesses whether each advisory actually reaches this app's attack
surface, so the alerts can be dismissed with an evidence-based reason rather
than left open indefinitely.

## App architecture facts that drive the verdicts

- `/` is **prerendered** (static); the entire `/dashboard/**` tree is
  `ssr: false` (client-only SPA). There are **no runtime-SSR pages**.
- **No server components, no `.server.vue` pages, no islands** (`<NuxtIsland>`).
  `hub.cache: false`; no `swr`/`isr`/route caching configured.
- Every `navigateTo(...)` and `<NuxtLink :to>` targets a **static internal
  route** (`/dashboard`, `/dashboard/login`, `/dashboard/link?slug=…`). No
  user-controlled navigation targets; no `reloadNuxtApp` usage.
- No `<NoScript>` head/slot content.
- Server API auth is enforced by `server/middleware/2.auth.ts` (site token),
  independent of Nuxt route middleware. The dashboard is single-tenant (one
  site token / operator).

## Verdicts

| Alerts | Advisory | Sev | Reaches this app? | Action |
|---|---|---|---|---|
| 149, 145 | GHSA-m3q2-p4fw-w38m — `<NoScript>` slot XSS | low | No — no noscript content | Dismiss · not_used |
| 148, 144 | CVE-2026-53722 — `<NuxtLink>` `javascript:`/`data:` XSS | med | No via NuxtLink — every `:to` is an internal route | Dismiss · not_used |
| 146, 142 | GHSA-c9cv-mq2m-ppp3 — `navigateTo`/`reloadNuxtApp` URL handling | med | No — only static internal paths; no `reloadNuxtApp` | Dismiss · not_used |
| 130, 129 | CVE-2026-47200 — `.server.vue` middleware bypass | med | No — no `.server.vue` pages | Dismiss · not_used |
| 124, 123 | CVE-2026-46342 — `__nuxt_island` cache poisoning | low | No — no islands; cache disabled | Dismiss · not_used |
| 122, 121 | CVE-2026-45669 — `navigateTo()` external redirect XSS | med | No — no external/user-controlled `navigateTo` | Dismiss · not_used |
| 39, 38 | CVE-2025-59414 — island payload path traversal | low | No — no islands | Dismiss · not_used |
| 19, 1 | CVE-2025-27415 — DOS via payload cache poisoning | **high** | Minimal — no runtime-SSR payload routes (`/` prerendered, dashboard SPA) | Dismiss · tolerable_risk |

## Notes

- **CVE-2025-27415 (high)** is the only one that isn't structurally absent. It
  needs a runtime-SSR page whose `_payload.json` is cached by a shared cache;
  this app has none, so practical exposure is minimal. It should still be closed
  for real by the eventual nuxt upgrade.
- **Defensive hardening (separate from these alerts):** user-submitted link URLs
  are validated with `z.string().url()` in `schemas/link.ts`, which accepts
  `javascript:` and `data:` URLs. Those are stored and later rendered in the
  dashboard as `<a :href="link.url">` (`components/dashboard/links/Link.vue`).
  It's single-tenant self-XSS, but cheap to close by restricting the URL scheme
  to `http`/`https` in the schema. Recommended as a follow-up; it does not
  affect any Dependabot alert.

## Long-term remediation

The clean fix for all of the above is the `nuxt 3.21.7` + `@nuxthub/core` 0.10
upgrade, done as its own PR and validated against a Cloudflare **preview**
deployment before merge (the step PR #19 skipped). Until then, the verdicts
above stand on the app's current architecture and should be re-checked if SSR,
server components, islands, or user-controlled navigation are ever introduced.

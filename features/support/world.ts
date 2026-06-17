import process from 'node:process'
import { setWorldConstructor, World } from '@cucumber/cucumber'

// When SINK_BASE_URL is set (e.g. a Cloudflare preview deploy in CI) the suite
// runs against that URL and skips booting a local server. Otherwise hooks.ts
// boots `nuxt dev` here and shares it across scenarios.
export const baseURL = process.env.SINK_BASE_URL ?? 'http://localhost:3013'

// True when we're driving an already-deployed target rather than a local boot.
export const usePreview = Boolean(process.env.SINK_BASE_URL)

// The default site token from runtimeConfig. The local dev server runs without
// a NUXT_SITE_TOKEN override, so 'SinkCool' is what the auth middleware expects;
// a deployed preview may set its own, so allow overriding via NUXT_SITE_TOKEN.
// An unset GitHub Actions secret arrives as '', so coalesce that to the default.
export const siteToken = process.env.NUXT_SITE_TOKEN || 'SinkCool'

// Per-scenario state. Steps that act store the response here; steps that assert
// read it back.
export class SinkWorld extends World {
  response?: Response
  body?: any
  slug?: string
}

setWorldConstructor(SinkWorld)

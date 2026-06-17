import { setWorldConstructor, World } from '@cucumber/cucumber'

// The dev server is booted once in hooks.ts and shared across scenarios.
export const baseURL = 'http://localhost:3013'

// The default site token from runtimeConfig — the dev server runs without a
// NUXT_SITE_TOKEN override, so this is what the auth middleware expects.
export const siteToken = 'SinkCool'

// Per-scenario state. Steps that act store the response here; steps that assert
// read it back.
export class SinkWorld extends World {
  response?: Response
  body?: any
  slug?: string
}

setWorldConstructor(SinkWorld)

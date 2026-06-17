import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { baseURL, type SinkWorld, siteToken } from '../support/world'

// Local dev KV persists across runs, so each scenario uses a fresh slug to
// avoid 409 conflicts. Generated rather than hard-coded in the feature.
function uniqueSlug(): string {
  return `e2e-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

async function createLink(url: string, slug: string): Promise<Response> {
  return fetch(`${baseURL}/api/link/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${siteToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, slug }),
  })
}

When('I create a short link for {string}', async function (this: SinkWorld, url: string) {
  this.slug = uniqueSlug()
  this.response = await createLink(url, this.slug)
  this.body = await this.response.json().catch(() => undefined)
})

Then('the short link is created', function (this: SinkWorld) {
  assert.equal(this.response?.status, 201)
  assert.equal(this.body?.shortLink?.endsWith(`/${this.slug}`), true, `expected shortLink ending in /${this.slug}, got ${this.body?.shortLink}`)
})

Given('a short link pointing to {string}', async function (this: SinkWorld, url: string) {
  this.slug = uniqueSlug()
  const response = await createLink(url, this.slug)
  assert.equal(response.status, 201, `setup failed to create link (status ${response.status})`)
})

When('I visit the short link', async function (this: SinkWorld) {
  this.response = await fetch(`${baseURL}/${this.slug}`, { redirect: 'manual' })
})

Then('I am redirected to {string}', function (this: SinkWorld, url: string) {
  assert.ok([301, 302, 307, 308].includes(this.response?.status ?? 0), `expected a redirect, got ${this.response?.status}`)
  assert.equal(this.response?.headers.get('location'), url)
})

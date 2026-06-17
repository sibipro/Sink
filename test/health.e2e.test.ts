import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { beforeEach, describe, expect, it } from 'vitest'

// Boots a real build of the server and exercises the HTTP surface. This is the
// gate the Nuxt-ecosystem bump (PR #19) slipped through: that change compiled
// and the Cloudflare Pages build went green, but the deployed server failed at
// runtime. A green build is not a working server — these tests assert the
// server actually serves requests.
describe('server health', async () => {
  await setup({
    // Boot the full Nuxt/Nitro server (middleware, routing, API handlers). The
    // production build uses the Cloudflare preset, which can't be served as a
    // plain node process here; the deployed-artifact runtime is guarded
    // separately by the post-deploy smoke test in CI.
    dev: true,
  })

  describe('requesting /api/verify with the site token', () => {
    let response: { name: string, url: string }

    beforeEach(async () => {
      response = await $fetch('/api/verify', {
        headers: { Authorization: 'Bearer SinkCool' },
      })
    })

    it('identifies the running app', () => {
      expect(response.name).toBe('Sink')
    })
  })

  describe('requesting /api/verify without a token', () => {
    let status: number

    beforeEach(async () => {
      const res = await fetch('/api/verify')
      status = res.status
    })

    it('is rejected by the auth middleware', () => {
      expect(status).toBe(401)
    })
  })
})

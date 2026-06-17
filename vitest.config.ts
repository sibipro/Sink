import { defineConfig } from 'vitest/config'

// e2e tests boot the built server out-of-process via @nuxt/test-utils, so the
// test file itself runs in a plain node environment — no Nuxt vitest runtime
// needed here.
export default defineConfig({
  test: {
    // A cold build + server boot is slow; give it room.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
})

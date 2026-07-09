import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { AfterAll, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber'
import { baseURL, siteToken, usePreview } from './world'

// A cold dev-server boot compiles the app; give hooks and steps room.
setDefaultTimeout(120_000)

let server: ChildProcess | undefined

async function waitForServer(timeoutMs = 90_000): Promise<void> {
  // Local: probe a KV-backed endpoint and wait for a 200 — routes go live while
  // Nuxt is still compiling (503 "loading") and the local KV binding initialises
  // a beat after that, so a 200 means fully ready.
  //
  // Preview: the branch-alias URL cuts over to this commit's Cloudflare deploy
  // per-PoP and eventually-consistently, so a single probe can land on a PoP that
  // still 404s *everything* — the "404-on-everything" race that failed PR #25/#41,
  // where the workflow gate confirmed the commit once but the suite fired ~1s later
  // against a not-yet-propagated edge. So treat 404 as not-ready and keep polling,
  // and require a few *consecutive* non-404s to ride past the cutover before any
  // scenario fires. We still must NOT require a working KV — a broken binding has
  // to surface as a scenario assertion (create → 500), not get swallowed here — so
  // any non-404 status counts as ready.
  const url = usePreview ? `${baseURL}/` : `${baseURL}/api/link/list`
  const stableNeeded = usePreview ? 3 : 1
  const deadline = Date.now() + timeoutMs
  let stable = 0
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${siteToken}` } })
      const ready = usePreview ? res.status !== 404 : res.status === 200
      if (ready) {
        if (++stable >= stableNeeded)
          return
      }
      else {
        stable = 0
      }
    }
    catch {
      // Connection refused / DNS not resolving yet — not listening.
      stable = 0
    }
    await delay(500)
  }
  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`)
}

BeforeAll(async () => {
  // Against a deployed preview there's nothing to boot; just confirm it's live.
  if (usePreview) {
    await waitForServer()
    return
  }

  const { port } = new URL(baseURL)
  // detached so we can kill the whole process group (nuxt spawns vite/workerd
  // children) in AfterAll. stderr inherits so startup failures are visible.
  server = spawn('./node_modules/.bin/nuxt', ['dev', '--port', port], {
    stdio: ['ignore', 'ignore', 'inherit'],
    detached: true,
    // Strip the parent's tsx loader: inheriting NODE_OPTIONS='--import tsx'
    // makes nuxt dev run under tsx too, which breaks nuxthub's local Cloudflare
    // (workerd) binding setup so KV never initialises.
    env: { ...process.env, NODE_OPTIONS: '' },
  })
  await waitForServer()
})

AfterAll(async () => {
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    }
    catch {
      // Already gone — nothing to clean up.
    }
  }
})

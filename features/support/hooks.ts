import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { AfterAll, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber'
import { waitUntilSettled } from './settle'
import { baseURL, siteToken, usePreview } from './world'

// A cold dev-server boot compiles the app; give hooks and steps room.
setDefaultTimeout(120_000)

let server: ChildProcess | undefined

async function waitForServer(timeoutMs = 90_000): Promise<void> {
  // Local: probe a KV-backed endpoint and wait for a 200 — routes go live while
  // Nuxt is still compiling (503 "loading") and the local KV binding initialises
  // a beat after that, so a 200 means fully ready. Nothing to settle: one 200 from
  // our own child process means ready.
  //
  // Preview: the branch-alias URL cuts over to this commit's Cloudflare deploy
  // per-PoP and eventually-consistently, so a probe can land on a PoP that still
  // 404s *everything* — the "404-on-everything" race that failed PR #25/#41/#60.
  // Treat 404 as not-ready and require consecutive non-404s spread over a settle
  // WINDOW, not a fast burst: PR #42's 3-probes-in-1.5s was satisfied by a single
  // already-cut-over edge while others were still 404ing (see settle.ts). We still
  // must NOT require a working KV — a broken binding has to surface as a scenario
  // assertion (create → 500), not get swallowed here — so any non-404 counts.
  const url = usePreview ? `${baseURL}/` : `${baseURL}/api/link/list`
  await waitUntilSettled({
    probe: async () => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${siteToken}` } })
        return usePreview ? res.status !== 404 : res.status === 200
      }
      catch {
        // Connection refused / DNS not resolving yet — not listening.
        return false
      }
    },
    consecutiveMatches: usePreview ? 3 : 1,
    settleMs: usePreview ? 15_000 : 0,
    intervalMs: usePreview ? 3_000 : 500,
    timeoutMs,
    describeTarget: `Server at ${url}`,
  })
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

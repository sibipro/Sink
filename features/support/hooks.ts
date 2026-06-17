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
  // Preview: the deploy is already live (CI gates this on the Cloudflare build),
  // so probe a binding-free, auth-free route and accept ANY response. We must NOT
  // require a working KV here — a broken binding has to surface as a scenario
  // assertion (create → 500), not get swallowed as a readiness timeout.
  const url = usePreview ? `${baseURL}/` : `${baseURL}/api/link/list`
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${siteToken}` } })
      if (usePreview || res.status === 200)
        return
    }
    catch {
      // Connection refused — not listening yet.
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

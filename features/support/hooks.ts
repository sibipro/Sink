import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { AfterAll, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber'
import { baseURL, siteToken } from './world'

// A cold dev-server boot compiles the app; give hooks and steps room.
setDefaultTimeout(120_000)

let server: ChildProcess | undefined

async function waitForServer(timeoutMs = 90_000): Promise<void> {
  // Probe a KV-backed endpoint: routes go live while Nuxt is still compiling
  // (503 "loading") and the local KV binding initialises a beat after that, so
  // a 200 here means the server is fully ready for the link scenarios.
  const url = `${baseURL}/api/link/list`
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${siteToken}` } })
      if (res.status === 200)
        return
    }
    catch {
      // Connection refused — not listening yet.
    }
    await delay(500)
  }
  throw new Error(`Dev server did not become ready at ${url} within ${timeoutMs}ms`)
}

BeforeAll(async () => {
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

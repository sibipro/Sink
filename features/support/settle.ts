import { setTimeout as delay } from 'node:timers/promises'

interface SettleOptions {
  probe: () => Promise<boolean>
  consecutiveMatches: number
  settleMs: number
  intervalMs: number
  timeoutMs: number
  describeTarget: string
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

// Waits until a target has probed ready `consecutiveMatches` times in a row AND
// the current streak has spanned at least `settleMs`. The elapsed-time floor is
// what a plain consecutive-match count cannot express: every probe from one
// runner lands on the same Cloudflare PoP (anycast picks it from the source IP),
// so a fast burst of matches only proves that ONE edge has cut over to this
// deploy while others can still be serving the previous branch-alias target and
// 404ing everything. The other PoPs are unobservable from here, so the only
// honest gate is to keep confirming across a window wide enough for the cutover
// to propagate. Any not-ready probe restarts the window.
export async function waitUntilSettled(options: SettleOptions): Promise<void> {
  const now = options.now ?? Date.now
  const sleep = options.sleep ?? delay
  const deadline = now() + options.timeoutMs

  let matches = 0
  let streakStartedAt = 0

  while (now() < deadline) {
    if (await options.probe()) {
      if (++matches === 1)
        streakStartedAt = now()
      if (matches >= options.consecutiveMatches && now() - streakStartedAt >= options.settleMs)
        return
    }
    else {
      matches = 0
    }
    await sleep(options.intervalMs)
  }

  throw new Error(`${options.describeTarget} did not settle within ${options.timeoutMs}ms`)
}

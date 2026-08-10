import type { SinkWorld } from '../support/world'
import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import { waitUntilSettled } from '../support/settle'

// A virtual clock: `sleep` advances it instead of really waiting, so a 30s settle
// window is exercised in microseconds and the assertions can be about elapsed
// virtual time rather than about probe counts.
function virtualClock() {
  let elapsedMs = 0
  return {
    now: () => elapsedMs,
    sleep: async (ms: number) => {
      elapsedMs += ms
    },
  }
}

Given('a preview that always probes ready', function (this: SinkWorld) {
  this.probeIsReadyAt = () => true
})

Given('a preview that never probes ready', function (this: SinkWorld) {
  this.probeIsReadyAt = () => false
})

Given('a preview that probes ready for {int} seconds, then 404s once, then is ready', function (this: SinkWorld, readyForSeconds: number) {
  this.probeIsReadyAt = (elapsedMs: number) => elapsedMs !== readyForSeconds * 1000
})

When('I wait for it to settle needing {int} matches over {int} seconds, probing every {int} seconds', async function (this: SinkWorld, consecutiveMatches: number, settleSeconds: number, intervalSeconds: number) {
  const clock = virtualClock()
  const probeIsReadyAt = this.probeIsReadyAt
  assert.ok(probeIsReadyAt, 'no probe assembled')

  try {
    await waitUntilSettled({
      probe: async () => probeIsReadyAt(clock.now()),
      consecutiveMatches,
      settleMs: settleSeconds * 1000,
      intervalMs: intervalSeconds * 1000,
      timeoutMs: 300_000,
      describeTarget: 'the preview',
      ...clock,
    })
    this.settledAtMs = clock.now()
  }
  catch (error) {
    this.settleError = error as Error
  }
})

Then('it settles no sooner than {int} seconds in', function (this: SinkWorld, seconds: number) {
  assert.equal(this.settleError, undefined, `expected settling to succeed, got ${this.settleError?.message}`)
  assert.ok(this.settledAtMs !== undefined && this.settledAtMs >= seconds * 1000, `expected to settle no sooner than ${seconds}s in, settled at ${(this.settledAtMs ?? 0) / 1000}s`)
})

Then('waiting for it to settle fails', function (this: SinkWorld) {
  assert.ok(this.settleError, 'expected settling to fail')
})

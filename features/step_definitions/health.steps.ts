import assert from 'node:assert/strict'
import { Then, When } from '@cucumber/cucumber'
import { baseURL, type SinkWorld, siteToken } from '../support/world'

When('I request {string} with the site token', async function (this: SinkWorld, path: string) {
  this.response = await fetch(`${baseURL}${path}`, {
    headers: { Authorization: `Bearer ${siteToken}` },
  })
  this.body = await this.response.json().catch(() => undefined)
})

When('I request {string} without a token', async function (this: SinkWorld, path: string) {
  this.response = await fetch(`${baseURL}${path}`)
})

Then('the response identifies the app as {string}', function (this: SinkWorld, name: string) {
  assert.equal(this.response?.status, 200)
  assert.equal(this.body?.name, name)
})

Then('the response status is {int}', function (this: SinkWorld, status: number) {
  assert.equal(this.response?.status, status)
})

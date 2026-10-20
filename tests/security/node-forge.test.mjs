import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { constants, generateKeyPairSync, privateEncrypt, sign } from 'node:crypto'
import { createRequire } from 'node:module'
// Node's built-in runner keeps these dependency-patch regressions independent of Nuxt.
// eslint-disable-next-line test/no-import-node-test
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const forge = require('node-forge')

const { asn1 } = forge
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 3,
})
const verifier = forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }))
const message = 'node-forge DigestAlgorithm regression'
const digest = forge.md.sha256.create().update(message).digest().getBytes()

function signatureWithAlgorithm(algorithmChildren) {
  const info = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, algorithmChildren),
    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, digest),
  ])
  return privateEncrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(asn1.toDer(info).getBytes(), 'binary')).toString('binary')
}

const oid = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes())
const nullParameter = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
const garbage = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false, 'garbage')

test('accepts a valid RSA SHA-256 signature', () => {
  const signature = sign('sha256', Buffer.from(message), privateKey)
  assert.equal(verifier.verify(digest, signature.toString('binary')), true)
})

test('accepts DigestAlgorithm with an omitted optional NULL', () => {
  assert.equal(verifier.verify(digest, signatureWithAlgorithm([oid])), true)
})

test('rejects extra nested DigestAlgorithm elements after NULL (CVE-2026-85393)', () => {
  assert.throws(() => verifier.verify(digest, signatureWithAlgorithm([oid, nullParameter, garbage])), /does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo/)
})

test('rejects extra nested DigestAlgorithm elements without NULL (CVE-2026-85393)', () => {
  assert.throws(() => verifier.verify(digest, signatureWithAlgorithm([oid, garbage])), /does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo/)
})

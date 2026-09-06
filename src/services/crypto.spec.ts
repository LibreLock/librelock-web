import { describe, expect, it } from 'vitest'

import {
  deriveFromMasterKey,
  deriveKeys,
  unwrapKey,
  wrapKey,
  generateVaultKey,
} from '@/services/crypto'
import { KDF_ITER, KDF_MEMORY, KDF_PARALLELISM } from '@/constants'

const params = {
  kdfSalt: 'a'.repeat(64),
  kdfIter: KDF_ITER,
  kdfMemory: KDF_MEMORY,
  kdfParallelism: KDF_PARALLELISM,
}

describe('deriveFromMasterKey', () => {
  // The split exists so biometric unlock can reach the same subkeys without the password.
  // If these two ever diverge, an enrolled device silently stops being able to log in
  it('reproduces exactly what deriveKeys derived from the password', async () => {
    const fromPassword = await deriveKeys('correct horse battery staple', params)
    const fromMasterKey = await deriveFromMasterKey(fromPassword.masterKeyBytes)

    expect(fromMasterKey.authCredential).toBe(fromPassword.authCredential)

    // Wrapping keys are non-extractable, so compare them by what they can open
    const vaultKey = await generateVaultKey()
    const protectedKey = await wrapKey(vaultKey, fromPassword.wrappingKey)
    const reopened = await unwrapKey(protectedKey, fromMasterKey.wrappingKey)
    expect(await crypto.subtle.exportKey('raw', reopened)).toEqual(
      await crypto.subtle.exportKey('raw', vaultKey),
    )
  }, 20000)

  it('returns the master key so an enrolment can reuse one password prompt', async () => {
    const { masterKeyBytes } = await deriveKeys('correct horse battery staple', params)
    expect(masterKeyBytes).toBeInstanceOf(Uint8Array)
    expect(masterKeyBytes.length).toBe(32)
  }, 20000)

  it('gives a different master key a different auth credential', async () => {
    const a = await deriveFromMasterKey(new Uint8Array(32).fill(1))
    const b = await deriveFromMasterKey(new Uint8Array(32).fill(2))
    expect(a.authCredential).not.toBe(b.authCredential)
  })
})

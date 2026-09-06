import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, unknown>()
vi.mock('@/services/keystore', () => ({
  putDeviceRecord: vi.fn<(id: string, record: unknown) => Promise<void>>(async (id, record) => {
    store.set(id, record)
  }),
  getDeviceRecord: vi.fn<(id: string) => Promise<unknown>>(async (id) => store.get(id) ?? null),
  deleteDeviceRecord: vi.fn<(id: string) => Promise<void>>(async (id) => {
    store.delete(id)
  }),
  listDeviceRecords: vi.fn<(prefix: string) => Promise<unknown[]>>(async (prefix) =>
    [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => v),
  ),
}))

import {
  CredentialMissingError,
  PrfUnsupportedError,
  UserCancelledError,
  enrollBiometric,
  getBiometricRecord,
  listBiometricRecords,
  removeBiometric,
  unlockWithBiometric,
} from '@/services/biometric'

const MASTER_KEY = new Uint8Array(32).fill(7)
const CREDENTIAL_ID = new Uint8Array([1, 2, 3, 4]).buffer

// A stand-in authenticator: PRF output is a stable function of the salt, which is exactly the
// property the real one provides and the only one the unlock path depends on
function prfFor(salt: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i++) out[i] = (salt[i % salt.length]! + i) & 0xff
  return out.buffer
}

// Loose stand-ins for the WebAuthn option bags, so the assertions below can read them back
type CreateInit = { publicKey: Record<string, unknown> }
type GetInit = {
  publicKey: {
    userVerification: string
    allowCredentials: { id: ArrayBuffer }[]
    extensions: { prf: { eval: { first: Uint8Array } } }
  }
}
type FakeCredential = { rawId: ArrayBuffer; getClientExtensionResults: () => unknown }
type CreateFn = (init: CreateInit) => Promise<FakeCredential>
type GetFn = (init: GetInit) => Promise<FakeCredential>

function installAuthenticator(options: { prfEnabled?: boolean; prfOnGet?: boolean } = {}) {
  const { prfEnabled = true, prfOnGet = true } = options
  const create = vi.fn<CreateFn>(async () => ({
    rawId: CREDENTIAL_ID,
    getClientExtensionResults: () => ({ prf: { enabled: prfEnabled } }),
  }))
  const get = vi.fn<GetFn>(async (init) => ({
    rawId: CREDENTIAL_ID,
    getClientExtensionResults: () =>
      prfOnGet
        ? { prf: { results: { first: prfFor(init.publicKey.extensions.prf.eval.first) } } }
        : {},
  }))
  vi.stubGlobal('navigator', { credentials: { create, get } })
  return { create, get }
}

beforeEach(() => {
  store.clear()
  vi.unstubAllGlobals()
  vi.stubGlobal('window', { location: { hostname: 'vault.example.com' } })
})

describe('enrollBiometric / unlockWithBiometric', () => {
  it('round-trips the master key through the authenticator', async () => {
    const { create, get } = installAuthenticator()

    const record = await enrollBiometric('lebar', MASTER_KEY)
    expect(create).toHaveBeenCalledOnce()
    // create() rarely returns PRF output, so enrollment must take a second assertion to get it
    expect(get).toHaveBeenCalledOnce()
    expect(record.username).toBe('lebar')
    // The stored record must never contain the master key in the clear
    expect(new Uint8Array(record.ciphertext)).not.toEqual(MASTER_KEY)

    const recovered = await unlockWithBiometric('lebar')
    expect(recovered).toEqual(MASTER_KEY)
  })

  it('demands user verification on both the credential and the assertion', async () => {
    const { create, get } = installAuthenticator()
    await enrollBiometric('lebar', MASTER_KEY)

    const createOptions = create.mock.calls[0]![0].publicKey as unknown as {
      authenticatorSelection: { userVerification: string; authenticatorAttachment: string }
      rp: { id: string }
    }
    expect(createOptions.authenticatorSelection.userVerification).toBe('required')
    expect(createOptions.authenticatorSelection.authenticatorAttachment).toBe('platform')
    expect(createOptions.rp.id).toBe('vault.example.com')
    expect(get.mock.calls[0]![0].publicKey.userVerification).toBe('required')
  })

  it('reports a device whose authenticator has no PRF support', async () => {
    installAuthenticator({ prfEnabled: false })
    await expect(enrollBiometric('lebar', MASTER_KEY)).rejects.toBeInstanceOf(PrfUnsupportedError)
    expect(await listBiometricRecords()).toEqual([])
  })

  it('reports a device that claims PRF but returns none', async () => {
    installAuthenticator({ prfOnGet: false })
    await expect(enrollBiometric('lebar', MASTER_KEY)).rejects.toBeInstanceOf(PrfUnsupportedError)
  })

  it('treats a dismissed prompt as a cancellation, not a failure', async () => {
    installAuthenticator()
    await enrollBiometric('lebar', MASTER_KEY)

    vi.stubGlobal('navigator', {
      credentials: {
        create: vi.fn<CreateFn>(),
        get: vi.fn<GetFn>(async () => {
          throw new DOMException('denied', 'NotAllowedError')
        }),
      },
    })
    await expect(unlockWithBiometric('lebar')).rejects.toBeInstanceOf(UserCancelledError)
    // A cancellation must leave the enrolment alone
    expect(await getBiometricRecord('lebar')).not.toBeNull()
  })

  it('drops the enrolment when the authenticator answers with the wrong key', async () => {
    installAuthenticator()
    await enrollBiometric('lebar', MASTER_KEY)

    // Same credential id, different PRF output: the OS passkey was replaced
    vi.stubGlobal('navigator', {
      credentials: {
        create: vi.fn<CreateFn>(),
        get: vi.fn<GetFn>(async () => ({
          rawId: CREDENTIAL_ID,
          getClientExtensionResults: () => ({
            prf: { results: { first: new Uint8Array(32).fill(9).buffer } },
          }),
        })),
      },
    })
    await expect(unlockWithBiometric('lebar')).rejects.toBeInstanceOf(CredentialMissingError)
    expect(await getBiometricRecord('lebar')).toBeNull()
  })

  it('reports an account that was never enrolled here', async () => {
    installAuthenticator()
    await expect(unlockWithBiometric('nobody')).rejects.toBeInstanceOf(CredentialMissingError)
  })

  it('keeps one record per account and removes only the named one', async () => {
    installAuthenticator()
    await enrollBiometric('lebar', MASTER_KEY)
    await enrollBiometric('other', new Uint8Array(32).fill(3))
    expect(await listBiometricRecords()).toHaveLength(2)

    await removeBiometric('lebar')
    const left = await listBiometricRecords()
    expect(left.map((r) => r.username)).toEqual(['other'])
  })
})

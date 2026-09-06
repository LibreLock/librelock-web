import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { VaultEntry, VaultPassword } from '@/api/vault'

// The store only needs the shapes here; the network side of @/api/vault is never exercised
vi.mock('@/api/vault', async () => {
  const actual = await vi.importActual<typeof import('@/api/vault')>('@/api/vault')
  return {
    ...actual,
    getVaultEntries: vi.fn<() => Promise<VaultEntry[]>>(),
    createVaultEntry: vi.fn<() => Promise<VaultEntry>>(),
    updateVaultEntry: vi.fn<() => Promise<VaultEntry>>(),
    deleteVaultEntry: vi.fn<() => Promise<void>>(),
  }
})

const infos: string[] = []
vi.mock('@/composables/useToast', () => ({
  toast: {
    info: (m: string) => infos.push(m),
    success: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'

function pw(over: Partial<VaultPassword> & { id: string; name: string }): VaultPassword {
  return {
    type: 'password',
    username: '',
    email: '',
    password: '',
    url: '',
    notes: '',
    ssoProvider: null,
    ssoLabel: '',
    ssoEntryId: null,
    excludeFromAnalytics: false,
    color: 'bg-blue-500',
    icon: null,
    categoryId: null,
    shared: false,
    passwordStrength: 0,
    reused: false,
    breached: false,
    createdAt: '',
    updatedAt: '',
    ...over,
  } as VaultPassword
}

let clipboard: string[]

beforeEach(() => {
  setActivePinia(createPinia())
  infos.length = 0
  clipboard = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: (v: string) => (clipboard.push(v), Promise.resolve()) },
  })
})

describe('copy fall-through for SSO entries', () => {
  it('copies the linked entry password when the entry has none of its own', async () => {
    const vault = useVaultStore()
    vault.entries = [
      pw({ id: 'g', name: 'Google', password: 'hunter2' }),
      pw({ id: 'a', name: 'App', ssoProvider: 'google', ssoEntryId: 'g' }),
    ] as VaultEntry[]

    const app = vault.entries[1]!
    expect(vault.canCopy(app)).toBe(true)
    expect(await vault.copyEntry(app)).toBe(true)
    expect(clipboard).toEqual(['hunter2'])
  })

  it("prefers the entry's own password over the linked one", async () => {
    const vault = useVaultStore()
    vault.entries = [
      pw({ id: 'g', name: 'Google', password: 'hunter2' }),
      pw({ id: 'a', name: 'App', password: 'own-secret', ssoProvider: 'google', ssoEntryId: 'g' }),
    ] as VaultEntry[]

    await vault.copyEntry(vault.entries[1]!)
    expect(clipboard).toEqual(['own-secret'])
  })

  it('follows a link into the organization vault', async () => {
    const vault = useVaultStore()
    const org = useOrgVaultStore()
    org.entries = [
      pw({ id: 'o', name: 'Okta', password: 'org-secret', shared: true }),
    ] as VaultEntry[]
    vault.entries = [
      pw({ id: 'a', name: 'App', ssoProvider: 'okta', ssoEntryId: 'o' }),
    ] as VaultEntry[]

    await vault.copyEntry(vault.entries[0]!)
    expect(clipboard).toEqual(['org-secret'])
  })

  it('explains a dangling link instead of copying nothing', async () => {
    const vault = useVaultStore()
    vault.entries = [
      pw({ id: 'a', name: 'App', ssoProvider: 'google', ssoEntryId: 'gone' }),
    ] as VaultEntry[]

    expect(vault.canCopy(vault.entries[0]!)).toBe(false)
    expect(await vault.copyEntry(vault.entries[0]!)).toBe(false)
    expect(infos[0]).toContain('sign-in entry is no longer in your vault')
    expect(clipboard).toEqual([])
  })

  it('names the provider for an unlinked SSO-only entry', async () => {
    const vault = useVaultStore()
    vault.entries = [pw({ id: 'a', name: 'App', ssoProvider: 'google' })] as VaultEntry[]

    expect(await vault.copyEntry(vault.entries[0]!)).toBe(false)
    expect(infos[0]).toBe('App signs in with Google - no password saved')
  })
})

describe('reuse detection with optional passwords', () => {
  it('never pairs two passwordless entries as reused', () => {
    const vault = useVaultStore()
    vault.entries = [
      pw({ id: '1', name: 'A', ssoProvider: 'google' }),
      pw({ id: '2', name: 'B', ssoProvider: 'apple' }),
    ] as VaultEntry[]

    expect(vault.isPasswordReused('')).toBe(false)
    expect(vault.getReusedWith('', '1')).toEqual([])
  })

  it('leaves analytics-excluded entries out of the reused set', () => {
    const vault = useVaultStore()
    vault.entries = [
      pw({ id: '1', name: 'A', password: 'shared-pw' }),
      pw({ id: '2', name: 'B', password: 'shared-pw', excludeFromAnalytics: true }),
    ] as VaultEntry[]

    expect(vault.isPasswordReused('shared-pw')).toBe(false)
    expect(vault.getReusedWith('shared-pw', '1')).toEqual([])
  })
})

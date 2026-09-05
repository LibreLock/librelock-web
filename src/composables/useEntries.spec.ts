import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CreateEntryPayload, UpdateEntryPayload, VaultEntry, VaultPassword } from '@/api/vault'

// Both vaults are driven through their API modules; only those are stubbed, so the stores and the
// facade run for real
const created: VaultEntry[] = []
const updates: { id: string; payload: UpdateEntryPayload }[] = []
const deleted: string[] = []
const deletedOrg: string[] = []
// Lets one test make a leg of the move fail without re-mocking the module
let failCreatePersonal = false
let orgDeleteError: unknown = null

function makeEntry(payload: CreateEntryPayload, id: string, shared: boolean): VaultEntry {
  return {
    id,
    shared,
    color: payload.color ?? 'bg-blue-500',
    icon: payload.icon ?? null,
    categoryId: payload.categoryId ?? null,
    createdAt: '',
    updatedAt: '',
    ...payload,
    passwordStrength: 0,
    reused: false,
    breached: false,
  } as VaultEntry
}

vi.mock('@/api/orgVault', () => ({
  createOrgVaultEntry: vi.fn<(p: CreateEntryPayload) => Promise<VaultEntry>>(async (p) => {
    const entry = makeEntry(p, 'org-new', true)
    created.push(entry)
    return entry
  }),
  updateOrgVaultEntry: vi.fn<(id: string, p: UpdateEntryPayload) => Promise<VaultEntry>>(
    async (id, p) => {
      updates.push({ id, payload: p })
      return makeEntry(p, id, true)
    },
  ),
  deleteOrgVaultEntry: vi.fn<(id: string) => Promise<void>>(async (id) => {
    if (orgDeleteError) throw orgDeleteError
    deletedOrg.push(id)
  }),
  getOrgVaultEntries: vi.fn<() => Promise<VaultEntry[]>>(async () => []),
}))

vi.mock('@/api/vault', async () => {
  const actual = await vi.importActual<typeof import('@/api/vault')>('@/api/vault')
  return {
    ...actual,
    getVaultEntries: vi.fn<() => Promise<VaultEntry[]>>(async () => []),
    createVaultEntry: vi.fn<(p: CreateEntryPayload) => Promise<VaultEntry>>(async (p) => {
      if (failCreatePersonal) throw new Error('vault is locked')
      const entry = makeEntry(p, 'new', false)
      created.push(entry)
      return entry
    }),
    updateVaultEntry: vi.fn<(id: string, p: UpdateEntryPayload) => Promise<VaultEntry>>(
      async (id, p) => {
        updates.push({ id, payload: p })
        return makeEntry(p, id, false)
      },
    ),
    deleteVaultEntry: vi.fn<(id: string) => Promise<void>>(async (id) => {
      deleted.push(id)
    }),
  }
})

vi.mock('@/services/keyring', () => ({
  getOrgKey: () => null,
  orgKeyRef: { value: null },
}))

import { useEntries } from '@/composables/useEntries'
import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'
import { ApiError } from '@/services/api'
import { toPasswordPayload } from '@/api/vault'

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

beforeEach(() => {
  setActivePinia(createPinia())
  created.length = 0
  updates.length = 0
  deleted.length = 0
  deletedOrg.length = 0
  failCreatePersonal = false
  orgDeleteError = null
})

describe('promoteToShared', () => {
  it('moves entries linked to the promoted entry onto its new shared id', async () => {
    const vault = useVaultStore()
    const google = pw({ id: 'abc', name: 'Google', password: 'hunter2' })
    vault.entries = [
      google,
      pw({ id: 's', name: 'Spotify', ssoProvider: 'google', ssoEntryId: 'abc' }),
      pw({ id: 'n', name: 'N26', ssoProvider: 'google', ssoEntryId: 'abc' }),
      pw({ id: 'x', name: 'Unrelated', password: 'other' }),
    ] as VaultEntry[]

    const entries = useEntries()
    await entries.promoteToShared(google, toPasswordPayload(google))

    expect(deleted).toEqual(['abc'])
    expect(updates.map((u) => u.id).sort()).toEqual(['n', 's'])
    for (const u of updates) {
      expect(u.payload.type === 'password' && u.payload.ssoEntryId).toBe('org-new')
    }
  })

  it('leaves entries with no link to the promoted entry alone', async () => {
    const vault = useVaultStore()
    const google = pw({ id: 'abc', name: 'Google', password: 'hunter2' })
    vault.entries = [google, pw({ id: 'x', name: 'Unrelated', password: 'other' })] as VaultEntry[]

    const entries = useEntries()
    await entries.promoteToShared(google, toPasswordPayload(google))

    expect(updates).toEqual([])
  })
})

describe('demoteToPrivate', () => {
  function seed() {
    const org = useOrgVaultStore()
    const vault = useVaultStore()
    const shared = pw({ id: 'org-1', name: 'Google', password: 'hunter2', shared: true })
    org.entries = [shared] as VaultEntry[]
    return { org, vault, shared }
  }

  it('creates the private copy before dropping the shared original', async () => {
    const { org, shared } = seed()
    const entries = useEntries()

    const moved = await entries.demoteToPrivate(shared, toPasswordPayload(shared))

    expect(created.map((e) => e.id)).toEqual(['new'])
    expect(deletedOrg).toEqual(['org-1'])
    expect(moved.shared).toBe(false)
    expect(org.entries).toEqual([])
  })

  it('drops the shared category, which means nothing in the personal vault', async () => {
    const { shared } = seed()
    const entries = useEntries()

    const moved = await entries.demoteToPrivate(shared, {
      ...toPasswordPayload(shared),
      categoryId: 'org-cat-1',
    })

    expect(moved.categoryId).toBeNull()
  })

  it('relinks personal entries that pointed at the shared id', async () => {
    const { vault, shared } = seed()
    vault.entries = [pw({ id: 's', name: 'Spotify', ssoEntryId: 'org-1' })] as VaultEntry[]
    const entries = useEntries()

    await entries.demoteToPrivate(shared, toPasswordPayload(shared))

    expect(updates.map((u) => u.id)).toEqual(['s'])
    expect(updates[0]!.payload.type === 'password' && updates[0]!.payload.ssoEntryId).toBe('new')
  })

  it('leaves shared linkers alone: repointing them would dangle for every other member', async () => {
    const { org, shared } = seed()
    org.entries = [
      ...org.entries,
      pw({ id: 'org-2', name: 'Team wiki', ssoEntryId: 'org-1', shared: true }),
    ] as VaultEntry[]
    const entries = useEntries()

    await entries.demoteToPrivate(shared, toPasswordPayload(shared))

    expect(updates).toEqual([])
  })

  it('never deletes the shared entry when the private copy could not be written', async () => {
    const { org, shared } = seed()
    failCreatePersonal = true
    const entries = useEntries()

    await expect(entries.demoteToPrivate(shared, toPasswordPayload(shared))).rejects.toThrow(
      'vault is locked',
    )
    expect(deletedOrg).toEqual([])
    expect(org.entries).toHaveLength(1)
  })

  it('treats an already-deleted shared entry as success', async () => {
    const { shared } = seed()
    orgDeleteError = new ApiError('Not found', 404, null)
    const entries = useEntries()

    const moved = await entries.demoteToPrivate(shared, toPasswordPayload(shared))

    expect(moved.id).toBe('new')
  })

  it('reports the leftover shared copy when only the delete leg fails', async () => {
    const { vault, shared } = seed()
    orgDeleteError = new ApiError('Server error', 500, null)
    const entries = useEntries()

    await expect(entries.demoteToPrivate(shared, toPasswordPayload(shared))).rejects.toThrow(
      'could not be removed',
    )
    // The private copy stands, so the user is not left without the secret
    expect(vault.entries.map((e) => e.id)).toEqual(['new'])
  })
})

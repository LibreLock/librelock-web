import { beforeEach, describe, expect, it } from 'vitest'
import { ENTRY_SORT_STORAGE_KEY } from '@/constants'
import { useEntrySort, type SortId } from '@/composables/useEntrySort'
import type { VaultEntry, VaultNote, VaultPassword } from '@/api/vault'

function password(over: Partial<VaultPassword> & { id: string; name: string }): VaultPassword {
  return {
    type: 'password',
    username: '',
    email: '',
    password: 'hunter2hunter2',
    url: '',
    notes: '',
    ssoProvider: null,
    ssoLabel: '',
    ssoEntryId: null,
    excludeFromAnalytics: false,
    color: 'bg-gray-700',
    icon: null,
    categoryId: null,
    shared: false,
    passwordStrength: 5,
    reused: false,
    breached: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  }
}

function note(over: Partial<VaultNote> & { id: string; name: string }): VaultNote {
  return {
    type: 'note',
    content: '',
    color: 'bg-gray-700',
    icon: null,
    categoryId: null,
    shared: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  }
}

function names(list: VaultEntry[]): string[] {
  return list.map((e) => e.name)
}

function sortWith(id: SortId, entries: VaultEntry[]): string[] {
  const { setSort, sortEntries } = useEntrySort('test')
  setSort(id)
  return names(sortEntries(entries))
}

describe('useEntrySort', () => {
  beforeEach(() => localStorage.clear())

  it('orders by name in both directions', () => {
    const entries = [
      password({ id: '1', name: 'Netflix' }),
      password({ id: '2', name: 'Amazon' }),
      password({ id: '3', name: 'zoom' }),
    ]
    expect(sortWith('name-asc', entries)).toEqual(['Amazon', 'Netflix', 'zoom'])
    expect(sortWith('name-desc', entries)).toEqual(['zoom', 'Netflix', 'Amazon'])
  })

  it('orders by created and updated dates', () => {
    const entries = [
      password({
        id: '1',
        name: 'Mid',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      }),
      password({
        id: '2',
        name: 'Old',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      }),
      password({
        id: '3',
        name: 'New',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z',
      }),
    ]
    expect(sortWith('created-desc', entries)).toEqual(['New', 'Mid', 'Old'])
    expect(sortWith('created-asc', entries)).toEqual(['Old', 'Mid', 'New'])
    expect(sortWith('updated-desc', entries)).toEqual(['Mid', 'New', 'Old'])
  })

  it('breaks ties by name then id', () => {
    const entries = [
      password({ id: 'b', name: 'Same' }),
      password({ id: 'a', name: 'Same' }),
      password({ id: 'c', name: 'Other' }),
    ]
    const { setSort, sortEntries } = useEntrySort('test')
    setSort('created-desc')
    expect(sortEntries(entries).map((e) => e.id)).toEqual(['c', 'a', 'b'])
  })

  it('persists per list key', () => {
    useEntrySort('passwords').setSort('created-desc')
    expect(useEntrySort('passwords').sortId.value).toBe('created-desc')
    expect(useEntrySort('notes').sortId.value).toBe('name-asc')
  })

  it('ignores a stored value that is not a known sort', () => {
    localStorage.setItem(ENTRY_SORT_STORAGE_KEY, JSON.stringify({ passwords: 'bogus' }))
    expect(useEntrySort('passwords').sortId.value).toBe('name-asc')
  })

  it('sorts note entries too', () => {
    const entries = [note({ id: '1', name: 'Recipes' }), note({ id: '2', name: 'Ideas' })]
    expect(sortWith('name-asc', entries)).toEqual(['Ideas', 'Recipes'])
  })
})

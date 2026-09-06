import { ref } from 'vue'
import { ENTRY_SORT_STORAGE_KEY } from '@/constants'
import type { VaultEntry } from '@/api/vault'

export type SortId = 'name-asc' | 'name-desc' | 'created-desc' | 'created-asc' | 'updated-desc'

export interface SortOption {
  value: SortId
  label: string
}

export const DEFAULT_SORT: SortId = 'name-asc'

export const SORT_OPTIONS: SortOption[] = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'created-desc', label: 'Newest first' },
  { value: 'created-asc', label: 'Oldest first' },
  { value: 'updated-desc', label: 'Recently updated' },
]

export function sortLabel(id: SortId): string {
  return SORT_OPTIONS.find((o) => o.value === id)?.label ?? ''
}

type SortMap = Record<string, SortId>

function readMap(): SortMap {
  try {
    const raw = localStorage.getItem(ENTRY_SORT_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as SortMap) : {}
  } catch {
    return {}
  }
}

function writeSort(listKey: string, sortId: SortId) {
  try {
    localStorage.setItem(
      ENTRY_SORT_STORAGE_KEY,
      JSON.stringify({ ...readMap(), [listKey]: sortId }),
    )
  } catch {
    // Private-mode storage throws; the sort still works for this session
  }
}

function isSortId(value: unknown): value is SortId {
  return SORT_OPTIONS.some((o) => o.value === value)
}

function timestamp(value: string): number {
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

function byName(a: VaultEntry, b: VaultEntry): number {
  return a.name.localeCompare(b.name)
}

function tieBreak(a: VaultEntry, b: VaultEntry): number {
  return byName(a, b) || a.id.localeCompare(b.id)
}

const comparators: Record<SortId, (a: VaultEntry, b: VaultEntry) => number> = {
  'name-asc': (a, b) => byName(a, b) || a.id.localeCompare(b.id),
  'name-desc': (a, b) => -byName(a, b) || a.id.localeCompare(b.id),
  'created-desc': (a, b) => timestamp(b.createdAt) - timestamp(a.createdAt) || tieBreak(a, b),
  'created-asc': (a, b) => timestamp(a.createdAt) - timestamp(b.createdAt) || tieBreak(a, b),
  'updated-desc': (a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt) || tieBreak(a, b),
}

export function useEntrySort(listKey: string) {
  const stored = readMap()[listKey]
  const sortId = ref<SortId>(isSortId(stored) ? stored : DEFAULT_SORT)

  function setSort(value: SortId) {
    sortId.value = value
    writeSort(listKey, value)
  }

  function sortEntries(list: VaultEntry[]): VaultEntry[] {
    return list.slice().sort(comparators[sortId.value])
  }

  return { sortId, setSort, sortEntries }
}

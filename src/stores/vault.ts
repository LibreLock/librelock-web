import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createVaultEntry,
  deleteVaultEntry,
  getVaultEntries,
  updateVaultEntry,
  type CreateEntryPayload,
  type UpdateEntryPayload,
  type VaultCard,
  type VaultEntry,
  type VaultPassword,
} from '@/api/vault'
import { checkPasswordBreach } from '@/composables/useBreachCheck'
import { useOrgVaultStore } from '@/stores/orgVault'

export { type VaultEntry, type VaultPassword, type VaultNote, type VaultCard } from '@/api/vault'

export const useVaultStore = defineStore('vault', () => {
  const entries = ref<VaultEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const passwords = computed(() =>
    entries.value.filter((e): e is VaultPassword => e.type === 'password'),
  )
  const notes = computed(() => entries.value.filter((e) => e.type === 'note'))
  const cards = computed(() => entries.value.filter((e): e is VaultCard => e.type === 'card'))

  const reusedPasswordMap = computed(() => {
    const map = new Map<string, VaultPassword[]>()
    for (const e of passwords.value) {
      const list = map.get(e.password) ?? []
      list.push(e)
      map.set(e.password, list)
    }
    return map
  })

  function isPasswordReused(password: string): boolean {
    return (reusedPasswordMap.value.get(password)?.length ?? 0) > 1
  }

  function getReusedWith(password: string, excludeId: string): VaultPassword[] {
    return (reusedPasswordMap.value.get(password) ?? []).filter((e) => e.id !== excludeId)
  }

  function getEntry(id: string): VaultEntry | null {
    return entries.value.find((e) => e.id === id) ?? null
  }

  const breachCheckingIds = ref(new Set<string>())
  const checkedBreachIds = ref(new Set<string>())

  async function checkEntryBreach(entry: VaultPassword): Promise<void> {
    if (checkedBreachIds.value.has(entry.id) || breachCheckingIds.value.has(entry.id)) return

    breachCheckingIds.value.add(entry.id)
    try {
      const breached = await checkPasswordBreach(entry.password)
      const live = entries.value.find((e) => e.id === entry.id)
      if (live && live.type === 'password') live.breached = breached
      checkedBreachIds.value.add(entry.id)
    } catch {
    } finally {
      breachCheckingIds.value.delete(entry.id)
    }
  }

  async function fetchEntries() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      entries.value = await getVaultEntries()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load vault.'
    } finally {
      loading.value = false
    }
  }

  async function addEntry(payload: CreateEntryPayload): Promise<VaultEntry> {
    const entry = await createVaultEntry(payload)
    entries.value.push(entry)
    return entry
  }

  async function editEntry(id: string, payload: UpdateEntryPayload): Promise<VaultEntry> {
    const updated = await updateVaultEntry(id, { ...payload })
    const index = entries.value.findIndex((e) => e.id === id)
    if (index !== -1) entries.value[index] = updated
    checkedBreachIds.value.delete(id)
    return updated
  }

  async function removeEntry(id: string): Promise<void> {
    await deleteVaultEntry(id)
    entries.value = entries.value.filter((e) => e.id !== id)
  }

  const globalSearch = ref('')

  // Spans the personal vault and the organization shared vault, so shared entries show up in search results wherever the search box is used
  const searchResults = computed(() => {
    const q = globalSearch.value.trim().toLowerCase()
    if (!q) return []
    const org = useOrgVaultStore()
    return [...entries.value, ...org.entries].filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true
      if (e.type === 'password') {
        return (
          e.username.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
        )
      }
      return false
    })
  })

  function primaryValue(entry: VaultEntry): string | null {
    switch (entry.type) {
      case 'password':
        return entry.password
      case 'card':
        return entry.cardNumber
      case 'note':
        return entry.content
      default:
        return null
    }
  }

  // Copies the primary secret (password / card number / note content) of the top search result, letting users jump straight to clipboard without opening the entry
  async function copyFirstSearchResult(): Promise<boolean> {
    const entry = searchResults.value[0]
    if (!entry) return false
    const value = primaryValue(entry)
    if (!value) return false
    await navigator.clipboard.writeText(value)
    return true
  }

  function clear() {
    entries.value = []
    error.value = null
    globalSearch.value = ''
    breachCheckingIds.value.clear()
    checkedBreachIds.value.clear()
  }

  return {
    entries,
    loading,
    error,
    passwords,
    notes,
    cards,
    globalSearch,
    searchResults,
    copyFirstSearchResult,
    breachCheckingIds,
    checkEntryBreach,
    getEntry,
    fetchEntries,
    addEntry,
    editEntry,
    removeEntry,
    clear,
    isPasswordReused,
    getReusedWith,
  }
})

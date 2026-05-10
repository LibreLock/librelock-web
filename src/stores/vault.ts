import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createVaultEntry,
  deleteVaultEntry,
  getVaultEntries,
  updateVaultEntry,
  type CreateEntryPayload,
  type UpdateEntryPayload,
  type VaultEntry,
  type VaultPassword,
} from '@/api/vault'

export { type VaultEntry, type VaultPassword, type VaultNote } from '@/api/vault'

export const useVaultStore = defineStore('vault', () => {
  const entries = ref<VaultEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const passwords = computed(() => entries.value.filter((e): e is VaultPassword => e.type === 'password'))
  const notes = computed(() => entries.value.filter((e) => e.type === 'note'))

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
    return updated
  }

  async function removeEntry(id: string): Promise<void> {
    await deleteVaultEntry(id)
    entries.value = entries.value.filter((e) => e.id !== id)
  }

  const globalSearch = ref('')

  function clear() {
    entries.value = []
    error.value = null
    globalSearch.value = ''
  }

  return {
    entries,
    loading,
    error,
    passwords,
    notes,
    globalSearch,
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

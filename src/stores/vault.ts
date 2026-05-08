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
} from '@/api/vault'

export { type VaultEntry, type VaultPassword, type VaultNote } from '@/api/vault'

export const useVaultStore = defineStore('vault', () => {
  const entries = ref<VaultEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const passwords = computed(() => entries.value.filter((e) => e.type === 'password'))
  const notes = computed(() => entries.value.filter((e) => e.type === 'note'))

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
    const existing = entries.value.find((e) => e.id === id)
    const merged = { ...payload, favorite: existing?.favorite ?? false }
    const updated = await updateVaultEntry(id, merged)
    const idx = entries.value.findIndex((e) => e.id === id)
    if (idx !== -1) entries.value[idx] = updated
    return updated
  }

  async function removeEntry(id: string): Promise<void> {
    await deleteVaultEntry(id)
    entries.value = entries.value.filter((e) => e.id !== id)
  }

  const globalSearch = ref('')

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
  }
})

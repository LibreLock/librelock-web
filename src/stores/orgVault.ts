import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createOrgVaultEntry,
  deleteOrgVaultEntry,
  getOrgVaultEntries,
  updateOrgVaultEntry,
} from '@/api/orgVault'
import type {
  CreateEntryPayload,
  UpdateEntryPayload,
  VaultCard,
  VaultEntry,
  VaultPassword,
} from '@/api/vault'
import { getOrgKey, orgKeyRef } from '@/services/keyring'
import { useOrganizationStore } from '@/stores/organization'

// The organization shared vault: entries encrypted with the org key, visible to every member who has been granted access
// Empty when the user has no access
export const useOrgVaultStore = defineStore('orgVault', () => {
  const entries = ref<VaultEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Require org mode too: a stale org key (e.g. left in IndexedDB from earlier org testing) must not expose shared-vault UI while the instance is personal
  const org = useOrganizationStore()
  const hasAccess = computed(() => org.isOrganization && orgKeyRef.value !== null)

  const passwords = computed(() =>
    entries.value.filter((e): e is VaultPassword => e.type === 'password'),
  )
  const notes = computed(() => entries.value.filter((e) => e.type === 'note'))
  const cards = computed(() => entries.value.filter((e): e is VaultCard => e.type === 'card'))

  function getEntry(id: string): VaultEntry | null {
    return entries.value.find((e) => e.id === id) ?? null
  }

  async function fetchEntries() {
    if (loading.value) return
    if (!getOrgKey()) {
      entries.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      entries.value = await getOrgVaultEntries()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load shared vault.'
    } finally {
      loading.value = false
    }
  }

  async function addEntry(payload: CreateEntryPayload): Promise<VaultEntry> {
    const entry = await createOrgVaultEntry(payload)
    entries.value.push(entry)
    return entry
  }

  async function editEntry(id: string, payload: UpdateEntryPayload): Promise<VaultEntry> {
    const updated = await updateOrgVaultEntry(id, { ...payload })
    const index = entries.value.findIndex((e) => e.id === id)
    if (index !== -1) entries.value[index] = updated
    return updated
  }

  async function removeEntry(id: string): Promise<void> {
    await deleteOrgVaultEntry(id)
    entries.value = entries.value.filter((e) => e.id !== id)
  }

  function clear() {
    entries.value = []
    error.value = null
  }

  return {
    entries,
    loading,
    error,
    hasAccess,
    passwords,
    notes,
    cards,
    getEntry,
    fetchEntries,
    addEntry,
    editEntry,
    removeEntry,
    clear,
  }
})

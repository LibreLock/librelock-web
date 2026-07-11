import { computed, reactive } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'
import type {
  CreateEntryPayload,
  UpdateEntryPayload,
  VaultCard,
  VaultEntry,
  VaultPassword,
} from '@/api/vault'

// Facade over the personal vault and the organization shared vault
// Views read merged lists and resolve/mutate entries without caring which store owns them; the `shared` flag on each entry routes writes to the right store
export function useEntries() {
  const vault = useVaultStore()
  const org = useOrgVaultStore()

  const entries = computed<VaultEntry[]>(() => [...vault.entries, ...org.entries])
  const passwords = computed<VaultPassword[]>(() => [...vault.passwords, ...org.passwords])
  const notes = computed(() => [...vault.notes, ...org.notes])
  const cards = computed<VaultCard[]>(() => [...vault.cards, ...org.cards])
  const loading = computed(() => vault.loading || org.loading)
  const hasOrgAccess = computed(() => org.hasAccess)

  async function fetchAll() {
    const jobs: Promise<unknown>[] = []
    if (vault.entries.length === 0) jobs.push(vault.fetchEntries())
    if (org.hasAccess && org.entries.length === 0) jobs.push(org.fetchEntries())
    await Promise.all(jobs)
  }

  function getEntry(id: string): VaultEntry | null {
    return vault.getEntry(id) ?? org.getEntry(id)
  }

  function addEntry(payload: CreateEntryPayload, shared: boolean): Promise<VaultEntry> {
    return shared ? org.addEntry(payload) : vault.addEntry(payload)
  }

  function editEntry(entry: VaultEntry, payload: UpdateEntryPayload): Promise<VaultEntry> {
    return entry.shared ? org.editEntry(entry.id, payload) : vault.editEntry(entry.id, payload)
  }

  function removeEntry(entry: VaultEntry): Promise<void> {
    return entry.shared ? org.removeEntry(entry.id) : vault.removeEntry(entry.id)
  }

  // One-way move of a private entry into the shared vault: create it in the org vault, then delete the personal copy
  // Demotion (shared -> private) is not offered; unsharing does not un-leak a secret others already saw
  async function promoteToShared(
    entry: VaultEntry,
    payload: CreateEntryPayload,
  ): Promise<VaultEntry> {
    const created = await org.addEntry(payload)
    await vault.removeEntry(entry.id)
    return created
  }

  // reactive() so nested refs unwrap on property access (`vault.passwords`), matching how consumers used the Pinia store this facade replaced
  return reactive({
    entries,
    passwords,
    notes,
    cards,
    loading,
    hasOrgAccess,
    fetchAll,
    getEntry,
    addEntry,
    editEntry,
    removeEntry,
    promoteToShared,
  })
}

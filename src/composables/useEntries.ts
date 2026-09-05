import { computed, reactive } from 'vue'
import { ApiError } from '@/services/api'
import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'
import {
  toPasswordPayload,
  type CreateEntryPayload,
  type UpdateEntryPayload,
  type VaultCard,
  type VaultEntry,
  type VaultPassword,
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

  // Move a private entry into the shared vault: create it in the org vault, then delete the personal copy
  async function promoteToShared(
    entry: VaultEntry,
    payload: CreateEntryPayload,
  ): Promise<VaultEntry> {
    const created = await org.addEntry(payload)
    await vault.removeEntry(entry.id)
    await relinkSsoTargets(entry.id, created.id)
    return created
  }

  // The way back out: create the private copy first, then drop the shared one. A failure between the
  // two leaves a duplicate the user can delete by hand, where the reverse order could destroy the
  // only copy. The secret stays known to everyone who had shared access - the caller is responsible
  // for prompting a rotation (see EntryFormView's exposure dialog)
  async function demoteToPrivate(
    entry: VaultEntry,
    payload: CreateEntryPayload,
  ): Promise<VaultEntry> {
    // Category ids are per-vault, so an org category means nothing in the personal vault
    const created = await vault.addEntry({ ...payload, categoryId: null })
    try {
      await org.removeEntry(entry.id)
    } catch (err) {
      // Another member deleting it first is the outcome we wanted; anything else leaves the secret
      // in the shared vault, which is exactly what the move was meant to end - say so plainly
      if (!(err instanceof ApiError) || err.status !== 404) {
        throw new Error(
          'Saved to your private vault, but the shared copy could not be removed. Delete it from the shared vault.',
        )
      }
    }
    // Only personal linkers: pointing a shared entry at a now-private id would resolve for the owner
    // and dangle invisibly for every other member, which is worse than leaving the link broken
    await relinkSsoTargets(entry.id, created.id, 'personal')
    return created
  }

  // Either move is a create plus a delete, so the moved entry carries a new id. Entries that pointed
  // at the original are moved over to it; left alone they would keep a dead ssoEntryId and silently
  // lose their password fall-through
  async function relinkSsoTargets(
    oldId: string,
    newId: string,
    scope: 'all' | 'personal' = 'all',
  ): Promise<void> {
    const pool = scope === 'personal' ? vault.passwords : passwords.value
    const linked = pool.filter((e) => e.ssoEntryId === oldId)
    for (const e of linked) {
      try {
        await editEntry(e, { ...toPasswordPayload(e), ssoEntryId: newId })
      } catch {
        // A link is a convenience: a failed rewrite must not fail the move itself
      }
    }
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
    demoteToPrivate,
  })
}

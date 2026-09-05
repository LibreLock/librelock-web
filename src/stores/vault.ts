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
  isAuditable,
} from '@/api/vault'
import { checkPasswordBreach } from '@/composables/useBreachCheck'
import { toast } from '@/composables/useToast'
import { ssoLabel } from '@/services/sso'
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
      if (!isAuditable(e)) continue
      const list = map.get(e.password) ?? []
      list.push(e)
      map.set(e.password, list)
    }
    return map
  })

  function isPasswordReused(password: string): boolean {
    if (!password) return false
    return (reusedPasswordMap.value.get(password)?.length ?? 0) > 1
  }

  function getReusedWith(password: string, excludeId: string): VaultPassword[] {
    if (!password) return []
    return (reusedPasswordMap.value.get(password) ?? []).filter((e) => e.id !== excludeId)
  }

  function getEntry(id: string): VaultEntry | null {
    return entries.value.find((e) => e.id === id) ?? null
  }

  const breachCheckingIds = ref(new Set<string>())
  const checkedBreachIds = ref(new Set<string>())

  async function checkEntryBreach(entry: VaultPassword): Promise<void> {
    if (!isAuditable(entry)) return
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

  function ssoSource(entry: VaultEntry): VaultPassword | null {
    if (entry.type !== 'password' || entry.password || !entry.ssoEntryId) return null
    const org = useOrgVaultStore()
    const linked =
      entries.value.find((e) => e.id === entry.ssoEntryId) ??
      org.entries.find((e) => e.id === entry.ssoEntryId) ??
      null
    return linked?.type === 'password' && linked.password ? linked : null
  }

  function primaryValue(entry: VaultEntry): string {
    switch (entry.type) {
      case 'password':
        return entry.password || (ssoSource(entry)?.password ?? '')
      case 'card':
        return entry.cardNumber
      case 'note':
        return entry.content
      default:
        return ''
    }
  }

  function canCopy(entry: VaultEntry): boolean {
    return primaryValue(entry).length > 0
  }

  function nothingToCopyMessage(entry: VaultEntry): string {
    if (entry.type === 'card') return `${entry.name} has no card number saved`
    if (entry.type === 'note') return `${entry.name} is empty`
    if (entry.type === 'password' && entry.ssoEntryId) {
      // The link outlives the entry it points at (deleted, or private to another member)
      return `${entry.name}'s sign-in entry is no longer in your vault`
    }
    if (entry.type === 'password' && entry.ssoProvider) {
      return `${entry.name} signs in with ${ssoLabel(entry.ssoProvider, entry.ssoLabel)} - no password saved`
    }
    return `${entry.name} has no password stored`
  }

  const visibleResults = ref<VaultEntry[]>([])
  const visibleSelectedId = ref<string | null>(null)

  function setVisibleResults(list: VaultEntry[], selectedId: string | null = null) {
    visibleResults.value = list
    visibleSelectedId.value = selectedId
  }

  const copyableResults = computed(() =>
    visibleResults.value.length > 0 ? visibleResults.value : searchResults.value,
  )

  const copiedEntryId = ref<string | null>(null)
  let copiedTimer: ReturnType<typeof setTimeout> | undefined

  async function copyEntry(entry: VaultEntry): Promise<boolean> {
    const value = primaryValue(entry)
    if (!value) {
      toast.info(nothingToCopyMessage(entry))
      return false
    }
    // An SSO entry holds no password of its own, so the copy silently comes from the entry it signs
    // in through - say whose password is now on the clipboard
    const source = ssoSource(entry)
    if (source) {
      toast.info(`Copied ${source.name}'s password - ${entry.name} signs in through it`)
    }
    await navigator.clipboard.writeText(value)
    copiedEntryId.value = entry.id
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copiedEntryId.value = null), 2000)
    return true
  }

  async function copySearchResult(index = 0): Promise<boolean> {
    const entry = copyableResults.value[index]
    return entry ? copyEntry(entry) : false
  }

  async function copySelectedSearchResult(): Promise<boolean> {
    const index = copyableResults.value.findIndex((e) => e.id === visibleSelectedId.value)
    return copySearchResult(index === -1 ? 0 : index)
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
    copyableResults,
    setVisibleResults,
    copySearchResult,
    copySelectedSearchResult,
    copyEntry,
    canCopy,
    copiedEntryId,
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

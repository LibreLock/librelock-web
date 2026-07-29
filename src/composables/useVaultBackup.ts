import { reactive, ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'
import { useCategoriesStore } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'
import {
  backupFilename,
  buildBackupFile,
  buildPayload,
  downloadBackup,
  fingerprintExisting,
  fingerprintImported,
  toCreatePayload,
  type BackupPayload,
  type BackupScope,
} from '@/services/backup'

export interface ImportSummary {
  imported: number
  skipped: number
  failed: number
  droppedCategories: string[]
}

export interface ImportOptions {
  skipDuplicates: boolean
}

export function useVaultBackup() {
  const vault = useVaultStore()
  const orgVault = useOrgVaultStore()
  const categories = useCategoriesStore()
  const orgCategories = useOrgCategoriesStore()

  const progress = ref<{ done: number; total: number } | null>(null)

  function stores(scope: BackupScope) {
    return scope === 'shared'
      ? { entries: orgVault, categories: orgCategories }
      : { entries: vault, categories }
  }

  async function collect(scope: BackupScope): Promise<BackupPayload> {
    const s = stores(scope)
    if (s.entries.entries.length === 0) await s.entries.fetchEntries()
    if (s.categories.categories.length === 0) await s.categories.fetchCategories()

    return buildPayload(
      s.entries.entries,
      s.categories.categories.map((c) => c.name),
      (id) => s.categories.getCategoryName(id),
    )
  }

  /** Decrypts the vault in the browser and downloads it, optionally re-encrypted under `passphrase`. */
  async function exportVault(scope: BackupScope, passphrase: string | null): Promise<number> {
    const payload = await collect(scope)
    const file = await buildBackupFile(scope, payload, passphrase)
    downloadBackup(file, backupFilename(scope, file.encrypted))
    return payload.entries.length
  }

  // Categories are matched by name; anything missing is created once up front so entries can reference it
  // Creation can legitimately fail (shared categories are admin-only), in which case the affected entries are still imported, just uncategorised
  async function resolveCategories(
    scope: BackupScope,
    payload: BackupPayload,
  ): Promise<{ byName: Map<string, string>; dropped: string[] }> {
    const s = stores(scope)
    if (s.categories.categories.length === 0) await s.categories.fetchCategories()

    const byName = new Map(s.categories.categories.map((c) => [c.name.toLowerCase(), c.id]))
    const dropped: string[] = []

    const wanted = new Set<string>(payload.categories)
    for (const entry of payload.entries) if (entry.category) wanted.add(entry.category)

    for (const name of wanted) {
      if (byName.has(name.toLowerCase())) continue
      try {
        const created = await s.categories.addCategory(name)
        byName.set(name.toLowerCase(), created.id)
      } catch {
        dropped.push(name)
      }
    }

    return { byName, dropped }
  }

  async function importVault(
    scope: BackupScope,
    payload: BackupPayload,
    options: ImportOptions,
  ): Promise<ImportSummary> {
    const s = stores(scope)
    if (s.entries.entries.length === 0) await s.entries.fetchEntries()

    const { byName, dropped } = await resolveCategories(scope, payload)

    const seen = new Set(options.skipDuplicates ? s.entries.entries.map(fingerprintExisting) : [])
    const summary: ImportSummary = {
      imported: 0,
      skipped: 0,
      failed: 0,
      droppedCategories: dropped,
    }

    const total = payload.entries.length
    let done = 0
    progress.value = { done, total }
    try {
      for (const entry of payload.entries) {
        const key = fingerprintImported(entry)
        if (options.skipDuplicates && seen.has(key)) {
          summary.skipped++
        } else {
          const categoryId = entry.category
            ? (byName.get(entry.category.toLowerCase()) ?? null)
            : null
          try {
            await s.entries.addEntry(toCreatePayload(entry, categoryId))
            seen.add(key)
            summary.imported++
          } catch {
            summary.failed++
          }
        }
        progress.value = { done: ++done, total }
      }
    } finally {
      progress.value = null
    }

    return summary
  }

  return reactive({ progress, exportVault, importVault })
}

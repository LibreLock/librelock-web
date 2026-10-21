<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import PasswordVisibilityToggle from '@/components/PasswordVisibilityToggle.vue'
import { listMembers } from '@/api/orgMembership'
import { useOrgVaultStore } from '@/stores/orgVault'
import { useVaultBackup, type ImportSummary } from '@/composables/useVaultBackup'
import {
  BackupError,
  decryptPayload,
  parseBackupFile,
  type BackupFile,
  type BackupPayload,
  type BackupScope,
} from '@/services/backup'
import { MAX_PASSWORD_LENGTH } from '@/constants'

const props = defineProps<{ scope: BackupScope }>()

const orgVault = useOrgVaultStore()
const backup = useVaultBackup()

const isShared = computed(() => props.scope === 'shared')
const vaultLabel = computed(() => (isShared.value ? 'shared vault' : 'personal vault'))

const locked = computed(() => isShared.value && !orgVault.hasAccess)
const checkingAccess = ref(false)
const sharedExists = ref(true)

onMounted(async () => {
  if (!locked.value) return
  checkingAccess.value = true
  try {
    sharedExists.value = (await listMembers()).some((m) => m.has_access)
  } catch {
    sharedExists.value = true // can't tell; the "no access" wording is the safer guess
  } finally {
    checkingAccess.value = false
  }
})

// Export
const protectExport = ref(true)
const exportPassword = ref('')
const exportConfirm = ref('')
const showExportPassword = ref(false)
const isExporting = ref(false)
const exportError = ref<string | null>(null)
const exportSuccess = ref<string | null>(null)

const exportMismatch = computed(
  () => exportConfirm.value.length > 0 && exportPassword.value !== exportConfirm.value,
)
const canExport = computed(() => {
  if (isExporting.value) return false
  if (!protectExport.value) return true
  return exportPassword.value.length > 0 && !exportMismatch.value
})

async function handleExport() {
  exportError.value = null
  exportSuccess.value = null
  isExporting.value = true
  try {
    const count = await backup.exportVault(
      props.scope,
      protectExport.value ? exportPassword.value : null,
    )
    exportSuccess.value = `Exported ${count} ${count === 1 ? 'entry' : 'entries'}`
    exportPassword.value = ''
    exportConfirm.value = ''
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : 'Export failed.'
  } finally {
    isExporting.value = false
  }
}

// Import
const skipDuplicates = ref(true)
const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string | null>(null)
const pendingFile = ref<BackupFile | null>(null)
const pendingPayload = ref<BackupPayload | null>(null)
const importPassword = ref('')
const showImportPassword = ref(false)
const isUnlocking = ref(false)
const isImporting = ref(false)
const importError = ref<string | null>(null)
const summary = ref<ImportSummary | null>(null)
const showImportModal = ref(false)

const scopeWarning = computed(() =>
  pendingFile.value && pendingFile.value.scope !== props.scope
    ? `This file was exported from the ${pendingFile.value.scope === 'shared' ? 'shared' : 'personal'} vault.`
    : null,
)

function resetImport() {
  fileName.value = null
  pendingFile.value = null
  pendingPayload.value = null
  importPassword.value = ''
  importError.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  resetImport()
  summary.value = null
  fileName.value = file.name
  try {
    const parsed = parseBackupFile(await file.text())
    pendingFile.value = parsed
    if (!parsed.encrypted) pendingPayload.value = parsed.payload
  } catch (err) {
    importError.value = err instanceof BackupError ? err.message : 'Could not read that file.'
  }
}

async function handleUnlock() {
  const file = pendingFile.value
  if (!file || !file.encrypted) return

  importError.value = null
  isUnlocking.value = true
  try {
    pendingPayload.value = await decryptPayload(file, importPassword.value)
    importPassword.value = ''
  } catch (err) {
    importError.value = err instanceof BackupError ? err.message : 'Could not decrypt that file.'
  } finally {
    isUnlocking.value = false
  }
}

async function confirmImport() {
  const payload = pendingPayload.value
  if (!payload) return

  importError.value = null
  isImporting.value = true
  try {
    summary.value = await backup.importVault(props.scope, payload, {
      skipDuplicates: skipDuplicates.value,
    })
    showImportModal.value = false
    resetImport()
  } catch (err) {
    importError.value = err instanceof Error ? err.message : 'Import failed.'
    showImportModal.value = false
  } finally {
    isImporting.value = false
  }
}

const inputClass =
  'w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition'
const passwordInputClass = `${inputClass} pr-10`
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="locked"
      class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07] px-4 sm:px-6 py-5"
    >
      <p v-if="checkingAccess" class="text-sm text-gray-400">Checking shared vault access…</p>

      <p v-else-if="!sharedExists" class="text-sm text-gray-600 dark:text-gray-300">
        Shared vault isn't set up. An owner can enable it in the Users tab.
      </p>

      <p v-else class="text-sm text-gray-600 dark:text-gray-300">
        You don't have shared-vault access yet, so its entries can't be decrypted in your browser.
        Ask an owner or a member with access to grant it in the Users tab, then reload.
      </p>
    </div>

    <template v-else>
      <div
        class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07]"
      >
        <div class="px-4 sm:px-6 pt-6 pb-1">
          <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Export</h2>
          <p class="mt-0.5 text-sm text-gray-400">Download a copy of the {{ vaultLabel }}</p>
        </div>

        <hr class="mt-3 border-gray-100 dark:border-white/[0.08]" />

        <div class="px-4 sm:px-6 py-5 space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
                Protect the file with a password
              </p>
              <p class="mt-0.5 text-sm text-gray-400">
                Backup file will be encrypted with Argon2id + AES-GCM
              </p>
            </div>
            <ToggleSwitch v-model="protectExport" />
          </div>

          <template v-if="protectExport">
            <div>
              <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                Backup password
              </label>
              <div class="relative">
                <input
                  v-model="exportPassword"
                  :type="showExportPassword ? 'text' : 'password'"
                  :maxlength="MAX_PASSWORD_LENGTH"
                  autocomplete="new-password"
                  :class="passwordInputClass"
                />
                <PasswordVisibilityToggle v-model="showExportPassword" />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
                Confirm backup password
              </label>
              <input
                v-model="exportConfirm"
                :type="showExportPassword ? 'text' : 'password'"
                :maxlength="MAX_PASSWORD_LENGTH"
                autocomplete="new-password"
                :class="inputClass"
              />
              <p v-if="exportMismatch" class="mt-1.5 text-xs text-red-600">
                Passwords do not match.
              </p>
            </div>

            <p class="text-sm text-gray-500 dark:text-gray-400">
              This password is not stored anywhere. If you lose it, the backup cannot be recovered.
            </p>
          </template>

          <p
            v-else
            class="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
          >
            The file will contain every password, card number, and note in plain text. Anyone who
            opens it reads the {{ vaultLabel }}.
          </p>

          <p v-if="exportError" class="text-sm text-red-600">{{ exportError }}</p>

          <div class="flex items-center gap-3">
            <button
              type="button"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              :disabled="!canExport"
              @click="handleExport"
            >
              {{ isExporting ? 'Exporting…' : 'Export vault' }}
            </button>
            <p v-if="exportSuccess" class="text-sm text-emerald-600">{{ exportSuccess }}</p>
          </div>
        </div>
      </div>

      <div
        class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07]"
      >
        <div class="px-4 sm:px-6 pt-6 pb-1">
          <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Import</h2>
          <p class="mt-0.5 text-sm text-gray-400">
            Restore entries from a LibreLock backup file into the {{ vaultLabel }}. Existing entries
            are never overwritten
          </p>
        </div>

        <hr class="mt-3 border-gray-100 dark:border-white/[0.08]" />

        <div class="px-4 sm:px-6 py-5 space-y-4">
          <p v-if="isShared" class="text-sm text-amber-600 dark:text-amber-400">
            Everything imported here is visible to every member with shared-vault access.
          </p>

          <div>
            <input
              ref="fileInput"
              type="file"
              accept="application/json,.json"
              class="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700 file:cursor-pointer cursor-pointer dark:file:bg-gray-100 dark:file:text-gray-900 dark:hover:file:bg-white"
              @change="handleFile"
            />
          </div>

          <div
            v-if="pendingFile"
            class="rounded-lg border border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 space-y-1"
          >
            <p class="break-all font-medium text-gray-800 dark:text-gray-200">{{ fileName }}</p>
            <p>
              <template v-if="pendingFile.exportedAt">
                Exported {{ new Date(pendingFile.exportedAt).toLocaleDateString() }} ·
              </template>
              {{ pendingFile.encrypted ? 'password protected' : 'plain text' }}
            </p>
            <p v-if="pendingPayload">
              {{ pendingPayload.entries.length }}
              {{ pendingPayload.entries.length === 1 ? 'entry' : 'entries' }},
              {{ pendingPayload.categories.length }} categories
            </p>
            <p v-if="scopeWarning" class="text-amber-600 dark:text-amber-400">{{ scopeWarning }}</p>
          </div>

          <div v-if="pendingFile?.encrypted && !pendingPayload" class="space-y-2">
            <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
              Backup password
            </label>
            <div class="relative">
              <input
                v-model="importPassword"
                :type="showImportPassword ? 'text' : 'password'"
                :maxlength="MAX_PASSWORD_LENGTH"
                autocomplete="off"
                :class="passwordInputClass"
                @keyup.enter="handleUnlock"
              />
              <PasswordVisibilityToggle v-model="showImportPassword" />
            </div>
            <button
              type="button"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              :disabled="isUnlocking || importPassword.length === 0"
              @click="handleUnlock"
            >
              {{ isUnlocking ? 'Unlocking…' : 'Unlock file' }}
            </button>
          </div>

          <div v-if="pendingPayload" class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Skip duplicates</p>
              <p class="mt-0.5 text-sm text-gray-400">
                Ignore entries whose name and secret already exist in this vault
              </p>
            </div>
            <ToggleSwitch v-model="skipDuplicates" />
          </div>

          <p v-if="importError" class="text-sm text-red-600">{{ importError }}</p>

          <div
            v-if="backup.progress"
            class="rounded-lg border border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-gray-800 px-4 py-3"
          >
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Importing {{ backup.progress.done }} / {{ backup.progress.total }}…
            </p>
            <div class="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                class="h-1.5 rounded-full bg-gray-800 dark:bg-gray-100 transition-all"
                :style="{ width: `${(backup.progress.done / backup.progress.total) * 100}%` }"
              />
            </div>
          </div>

          <div
            v-if="summary"
            class="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 space-y-1"
          >
            <p>
              Imported {{ summary.imported }}, skipped {{ summary.skipped }}, failed
              {{ summary.failed }}.
            </p>
            <p v-if="summary.droppedCategories.length" class="text-amber-600 dark:text-amber-400">
              Could not create categories: {{ summary.droppedCategories.join(', ') }}. Those entries
              were imported without one.
            </p>
          </div>

          <button
            v-if="pendingPayload"
            type="button"
            class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            :disabled="isImporting"
            @click="showImportModal = true"
          >
            Import {{ pendingPayload.entries.length }}
            {{ pendingPayload.entries.length === 1 ? 'entry' : 'entries' }}…
          </button>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="showImportModal && pendingPayload"
        class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
        @click.self="showImportModal = false"
      >
        <div
          class="max-w-md w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
        >
          <h3 class="text-[17px] font-semibold text-gray-900 dark:text-gray-50">Import backup?</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ pendingPayload.entries.length }} entries will be added to the {{ vaultLabel }}.
            Nothing currently in it is changed or removed.
          </p>
          <p v-if="isShared" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Shared entries are readable by every member with shared-vault access.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg bg-gray-900/[0.05] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/[0.09] cursor-pointer disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]"
              :disabled="isImporting"
              @click="showImportModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              :disabled="isImporting"
              @click="confirmImport"
            >
              {{ isImporting ? 'Importing…' : 'Import' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

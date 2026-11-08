<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhCamera, PhImage } from '@phosphor-icons/vue'
import { toPasswordPayload, type VaultPassword } from '@/api/vault'
import QrScannerModal from '@/components/QrScannerModal.vue'
import { useEntries } from '@/composables/useEntries'
import { toast } from '@/composables/useToast'
import { decodeQrFromFile } from '@/services/qr'
import { toOtpUri } from '@/services/totp'
import {
  accountFields,
  dedupeBySecret,
  parseImportText,
  planImport,
  type ImportRow,
} from '@/services/totpTransfer'

const emit = defineEmits<{ (e: 'close'): void; (e: 'imported', count: number): void }>()

const vault = useEntries()

const pasted = ref('')
// Texts decoded from QR images and the camera; kept apart from the textarea so editing it never
// throws away a scan
const scannedTexts = ref<string[]>([])
const notes = ref<string[]>([])
const scanning = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)

const canScan = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const parsed = computed(() => parseImportText([pasted.value, ...scannedTexts.value].join('\n')))
const found = computed(() => dedupeBySecret(parsed.value.items))

const rows = computed(() => planImport(found.value, vault.passwords))
type Row = ImportRow<VaultPassword>

const deselected = ref(new Set<string>())
const isSelected = (r: Row) => r.status !== 'duplicate' && !deselected.value.has(r.params.secret)
const selectedRows = computed(() => rows.value.filter(isSelected))

function toggle(r: Row) {
  const next = new Set(deselected.value)
  if (next.has(r.params.secret)) next.delete(r.params.secret)
  else next.add(r.params.secret)
  deselected.value = next
}

function statusLabel(r: Row): string {
  if (r.status === 'duplicate') return 'Already in your vault'
  if (r.status === 'merge' && r.target) return `Adds to "${r.target.name}"`
  return 'New entry'
}

function addScanned(text: string) {
  if (!scannedTexts.value.includes(text)) scannedTexts.value = [...scannedTexts.value, text]
}

async function readImage(file: File) {
  try {
    const text = await decodeQrFromFile(file)
    const result = text ? parseImportText(text) : null
    if (!text || !result || (result.items.length === 0 && result.skippedHotp === 0)) {
      notes.value.push(`No 2FA export QR code found in ${file.name || 'that image'}.`)
      return
    }
    addScanned(text)
  } catch {
    notes.value.push(`Could not read ${file.name || 'that image'}.`)
  }
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  notes.value = []
  for (const file of files) await readImage(file)
}

// A screenshot pasted straight into the box is read like an uploaded one
function onPaste(e: ClipboardEvent) {
  const images = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
  if (images.length === 0) return
  e.preventDefault()
  notes.value = []
  void Promise.all(images.map(readImage))
}

async function runImport() {
  if (importing.value || selectedRows.value.length === 0) return
  importing.value = true

  let added = 0
  let merged = 0
  let failed = 0
  for (const row of selectedRows.value) {
    const totp = toOtpUri(row.params)
    try {
      if (row.status === 'merge' && row.target) {
        await vault.editEntry(row.target, { ...toPasswordPayload(row.target), totp })
        merged++
      } else {
        await vault.addEntry(
          {
            type: 'password',
            name: row.name,
            ...accountFields(row.params.account),
            password: '',
            url: '',
            notes: '',
            totp,
          },
          false,
        )
        added++
      }
    } catch {
      failed++
    }
  }
  importing.value = false

  const done = added + merged
  if (done > 0) {
    const parts = [`${added} new`]
    if (merged > 0) parts.push(`${merged} added to existing entries`)
    toast.success(`Imported ${done} ${done === 1 ? 'code' : 'codes'} (${parts.join(', ')})`)
    emit('imported', done)
  }
  if (failed > 0) toast.error(`${failed} ${failed === 1 ? 'code' : 'codes'} could not be saved`)
  if (failed === 0) emit('close')
}

const secondary =
  'inline-flex items-center gap-2 rounded-lg bg-gray-900/5 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/9 cursor-pointer dark:bg-white/8 dark:text-gray-100 dark:hover:bg-white/12'
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
    role="dialog"
    aria-modal="true"
    aria-label="Import 2FA codes"
    @click.self="emit('close')"
  >
    <div
      class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl ring-1 ring-gray-900/6 dark:bg-gray-900 dark:ring-white/8"
    >
      <div class="overflow-y-auto p-5 sm:p-6">
        <h2 class="mb-1 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
          Import 2FA codes
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Bring your codes over from Google Authenticator, or from any app that exports
          <span class="font-mono text-[13px]">otpauth://</span> links. Everything is read in this
          browser; nothing is uploaded.
        </p>

        <label
          for="totp-import-text"
          class="mt-5 mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >Paste links</label
        >
        <textarea
          id="totp-import-text"
          v-model="pasted"
          rows="3"
          spellcheck="false"
          autocomplete="off"
          placeholder="otpauth-migration://offline?data=…  or  otpauth://totp/…, one per line"
          class="w-full rounded-lg border px-3 py-2 font-mono text-[13px] border-gray-200 dark:border-white/10 bg-white dark:bg-white/4 text-gray-900 dark:text-gray-100 placeholder:font-sans placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/6 dark:focus:border-white/25 dark:focus:ring-white/6 transition"
          @paste="onPaste"
        />

        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" :class="secondary" @click="fileInput?.click()">
            <PhImage :size="16" /> QR image
          </button>
          <button v-if="canScan" type="button" :class="secondary" @click="scanning = true">
            <PhCamera :size="16" /> Scan with camera
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onFiles"
          />
        </div>

        <details class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <summary class="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
            How do I export from Google Authenticator?
          </summary>
          <ol class="mt-2 list-decimal space-y-1 pl-5">
            <li>Open Google Authenticator and tap the menu, then <b>Transfer accounts</b>.</li>
            <li>Choose <b>Export accounts</b>, select the ones to move and continue.</li>
            <li>
              It shows a QR code (several, for many accounts). Scan it here with the camera, or
              screenshot it on another device and add the image.
            </li>
          </ol>
          <p class="mt-2">
            The screenshot holds your secrets: delete it once the import is done. Google
            Authenticator only exports to a QR code, so a single device is needed to scan from.
          </p>
        </details>

        <ul
          v-if="notes.length > 0"
          class="mt-4 space-y-1 text-sm text-amber-600 dark:text-amber-400"
        >
          <li v-for="n in notes" :key="n">{{ n }}</li>
        </ul>

        <div v-if="rows.length > 0" class="mt-5">
          <p class="mb-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">
            {{ rows.length }} {{ rows.length === 1 ? 'account' : 'accounts' }} found
          </p>
          <ul
            class="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl ring-1 ring-gray-900/6 dark:divide-white/8 dark:ring-white/7"
          >
            <li v-for="r in rows" :key="r.params.secret">
              <label
                class="flex items-center gap-3 px-3.5 py-2.5"
                :class="
                  r.status === 'duplicate'
                    ? 'opacity-60'
                    : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/3'
                "
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 shrink-0 accent-gray-800 dark:accent-gray-200"
                  :checked="isSelected(r)"
                  :disabled="r.status === 'duplicate'"
                  @change="toggle(r)"
                />
                <span class="min-w-0 flex-1">
                  <span
                    class="block truncate text-sm font-medium text-gray-900 dark:text-gray-100"
                    >{{ r.name }}</span
                  >
                  <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{
                    r.params.account || 'No account name'
                  }}</span>
                </span>
                <span class="shrink-0 text-xs text-gray-500 dark:text-gray-400">{{
                  statusLabel(r)
                }}</span>
              </label>
            </li>
          </ul>
        </div>

        <p
          v-if="parsed.skippedHotp > 0 || parsed.invalid > 0"
          class="mt-3 text-xs text-gray-500 dark:text-gray-400"
        >
          <template v-if="parsed.skippedHotp > 0">
            {{ parsed.skippedHotp }} counter-based (HOTP)
            {{ parsed.skippedHotp === 1 ? 'account was' : 'accounts were' }} skipped: only
            time-based codes are supported.
          </template>
          <template v-if="parsed.invalid > 0">
            {{ parsed.invalid }} {{ parsed.invalid === 1 ? 'item' : 'items' }} could not be read.
          </template>
        </p>
      </div>

      <div
        class="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-3.5 sm:px-6 dark:border-white/8"
      >
        <button type="button" :class="secondary" @click="emit('close')">Cancel</button>
        <button
          type="button"
          class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          :disabled="importing || selectedRows.length === 0"
          @click="runImport"
        >
          {{
            importing
              ? 'Importing…'
              : selectedRows.length > 0
                ? `Import ${selectedRows.length} ${selectedRows.length === 1 ? 'code' : 'codes'}`
                : 'Import'
          }}
        </button>
      </div>
    </div>

    <QrScannerModal v-if="scanning" mode="import" @scanned="addScanned" @close="scanning = false" />
  </div>
</template>

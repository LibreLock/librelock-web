<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhCamera, PhImage } from '@phosphor-icons/vue'
import QrScannerModal from '@/components/QrScannerModal.vue'
import TotpCode from '@/components/TotpCode.vue'
import { useTotp } from '@/composables/useTotp'
import { decodeQrFromFile } from '@/services/qr'
import { parseOtpInput, type TotpParams } from '@/services/totp'

const props = defineProps<{ disabled?: boolean }>()
const model = defineModel<string>({ required: true })
const emit = defineEmits<{ (e: 'detected', params: TotpParams): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const scanning = ref(false)
const qrError = ref<string | null>(null)

const canScan = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

const text = computed(() => model.value.trim())
const parsed = computed(() => (text.value ? parseOtpInput(text.value) : null))
const problem = computed(() => (parsed.value && !parsed.value.ok ? parsed.value.error : null))

const { code } = useTotp(() => (parsed.value?.ok ? text.value : null))

function accept(value: string): boolean {
  const result = parseOtpInput(value)
  if (!result.ok) {
    qrError.value = result.error
    return false
  }
  qrError.value = null
  model.value = value.trim()
  emit('detected', result.params)
  return true
}

async function readImage(file: Blob) {
  qrError.value = null
  try {
    const found = await decodeQrFromFile(file)
    if (!found) {
      qrError.value = 'No QR code found in that image.'
      return
    }
    accept(found)
  } catch {
    qrError.value = 'Could not read that image.'
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) await readImage(file)
}

// A screenshot pasted straight into the field (Ctrl/Cmd+V) is read like an uploaded one
function onPaste(e: ClipboardEvent) {
  if (props.disabled) return
  const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
  if (!file) return
  e.preventDefault()
  void readImage(file)
}

function onScanned(value: string) {
  scanning.value = false
  accept(value)
}

const iconBtn =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/4 dark:text-gray-300 dark:hover:bg-white/8 dark:hover:text-gray-50'
</script>

<template>
  <div>
    <label
      for="totp-input"
      class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
      >Two-factor code (TOTP)</label
    >
    <div class="flex gap-2">
      <input
        id="totp-input"
        v-model="model"
        :disabled="disabled"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Setup key or otpauth:// link"
        :aria-invalid="problem ? 'true' : undefined"
        class="min-w-0 flex-1 rounded-lg border px-3 py-2 font-mono placeholder:font-sans text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/4 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/6 dark:focus:border-white/25 dark:focus:ring-white/6 transition disabled:cursor-not-allowed disabled:opacity-60"
        @paste="onPaste"
      />
      <button
        type="button"
        :class="iconBtn"
        :disabled="disabled"
        title="Read a QR code from an image"
        aria-label="Read a QR code from an image"
        @click="fileInput?.click()"
      >
        <PhImage :size="18" />
      </button>
      <button
        v-if="canScan"
        type="button"
        :class="iconBtn"
        :disabled="disabled"
        title="Scan a QR code with the camera"
        aria-label="Scan a QR code with the camera"
        @click="scanning = true"
      >
        <PhCamera :size="18" />
      </button>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
    </div>

    <p v-if="problem || qrError" class="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
      {{ qrError ?? problem }}
    </p>
    <p
      v-else-if="parsed?.ok && code"
      class="mt-1.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
    >
      <span>Current code:</span>
      <TotpCode :uri="text" />
    </p>

    <p class="mt-1.5 text-xs text-gray-400">
      Paste the setup key a site shows, or read its QR code. Storing 2FA next to the password means
      anyone who opens this vault gets both, so for critical accounts (email, bank) consider keeping
      the code in a separate authenticator.
    </p>

    <QrScannerModal v-if="scanning" @scanned="onScanned" @close="scanning = false" />
  </div>
</template>

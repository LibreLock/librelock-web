<script setup lang="ts">
import { computed } from 'vue'
import { toast } from '@/composables/useToast'
import { buildOtpauthList, type ExportableEntry } from '@/services/totpTransfer'

const props = defineProps<{ entries: ExportableEntry[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const text = computed(() => buildOtpauthList(props.entries))
const count = computed(() => (text.value ? text.value.trim().split('\n').length : 0))

function download() {
  const date = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(new Blob([text.value], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `librelock-2fa-${date}-plaintext.txt`
  link.click()
  URL.revokeObjectURL(url)
  toast.success(`Exported ${count.value} ${count.value === 1 ? 'code' : 'codes'}`)
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
    role="dialog"
    aria-modal="true"
    aria-label="Export 2FA codes"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/6 dark:bg-gray-900 dark:ring-white/8"
    >
      <h2 class="mb-1.5 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
        Export 2FA codes
      </h2>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Downloads {{ count }} {{ count === 1 ? 'code' : 'codes' }} as a text file with one
        <span class="font-mono text-[13px]">otpauth://</span> link per line, which most
        authenticator apps can import. Entries in the shared vault are not included.
      </p>
      <p
        class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      >
        The file holds your 2FA secrets in plain text. Anyone who gets it can generate your codes,
        so delete it as soon as you have imported it.
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg bg-gray-900/5 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/9 cursor-pointer dark:bg-white/8 dark:text-gray-100 dark:hover:bg-white/12"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          :disabled="count === 0"
          @click="download"
        >
          Download
        </button>
      </div>
    </div>
  </div>
</template>

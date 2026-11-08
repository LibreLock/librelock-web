<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { decodeQr } from '@/services/qr'
import { parseOtpInput } from '@/services/totp'
import { isMigrationLink, parseImportText, parseMigrationLink } from '@/services/totpTransfer'

// `otp`: one setup code, then close. `import`: stays open across several QR codes (Google
// Authenticator splits a big export into numbered ones) and reports each through `scanned`
const props = withDefaults(defineProps<{ mode?: 'otp' | 'import' }>(), { mode: 'otp' })

const emit = defineEmits<{
  (e: 'scanned', text: string): void
  (e: 'close'): void
}>()

const video = ref<HTMLVideoElement | null>(null)
const error = ref<string | null>(null)
const starting = ref(true)
const notice = ref<string | null>(null)

// Import mode progress
const seen = new Set<string>()
const accounts = ref(0)
const scannedCodes = ref(0)
const batchTotal = ref<number | null>(null)

let stream: MediaStream | null = null
let raf = 0
let lastTry = 0
let busy = false
let stopped = false

// ~8 decodes a second is plenty for a QR held still in front of the lens, and spares the battery
const INTERVAL_MS = 125

function stop() {
  stopped = true
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
}

// True when the scan finished the whole export and the camera is done
function acceptImport(text: string): boolean {
  // The camera sees the same QR for many frames in a row
  if (seen.has(text)) return false

  const parsed = parseImportText(text)
  if (parsed.items.length === 0 && parsed.skippedHotp === 0) {
    notice.value = 'That QR code is not a 2FA export.'
    return false
  }

  seen.add(text)
  notice.value = null
  scannedCodes.value = seen.size
  accounts.value += parsed.items.length
  if (isMigrationLink(text)) {
    const size = parseMigrationLink(text)?.batch?.size
    if (size) batchTotal.value = size
  }
  emit('scanned', text)

  // Every numbered QR code of the export is in: nothing left to point at
  if (batchTotal.value !== null && seen.size >= batchTotal.value) {
    stop()
    emit('close')
    return true
  }
  return false
}

async function tick(ts: number) {
  if (stopped) return
  const el = video.value
  if (el && el.readyState >= 2 && !busy && ts - lastTry >= INTERVAL_MS) {
    lastTry = ts
    busy = true
    try {
      const text = await decodeQr(el)
      if (text && !stopped) {
        if (props.mode === 'import') {
          if (acceptImport(text)) return
        } else if (parseOtpInput(text).ok) {
          // Any QR will decode; only a 2FA setup code is wanted, so keep looking at the rest
          stop()
          emit('scanned', text)
          return
        } else {
          notice.value = 'That QR code is not a 2FA setup code.'
        }
      }
    } catch {
      // a bad frame is not fatal, try the next one
    } finally {
      busy = false
    }
  }
  raf = requestAnimationFrame(tick)
}

function describe(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Allow it in your browser or site settings and try again.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device.'
  }
  if (name === 'NotReadableError') return 'The camera is in use by another app.'
  return 'Could not start the camera.'
}

onMounted(async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = 'This browser cannot access the camera here (it needs HTTPS).'
    starting.value = false
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    // Closed while the permission prompt was open: release the camera again straight away
    if (stopped) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    const el = video.value
    if (!el) return
    el.srcObject = stream
    await el.play()
    starting.value = false
    raf = requestAnimationFrame(tick)
  } catch (err) {
    error.value = describe(err)
    starting.value = false
  }
})

onBeforeUnmount(stop)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
    role="dialog"
    aria-modal="true"
    aria-label="Scan 2FA QR code"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div
      class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-gray-900/6 dark:bg-gray-900 dark:ring-white/8"
    >
      <h2 class="mb-1 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
        {{ mode === 'import' ? 'Scan export QR codes' : 'Scan 2FA QR code' }}
      </h2>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <template v-if="mode === 'import'">
          Show each QR code of the export to the camera in turn. If there are several, it moves on
          by itself. Nothing is recorded or uploaded.
        </template>
        <template v-else>
          Point the camera at the QR code the website shows. Nothing is recorded or uploaded.
        </template>
      </p>

      <div
        v-if="!error"
        class="relative aspect-square overflow-hidden rounded-xl bg-gray-950 ring-1 ring-gray-900/10 dark:ring-white/10"
      >
        <video ref="video" class="h-full w-full object-cover" playsinline muted />
        <div
          v-if="starting"
          class="absolute inset-0 flex items-center justify-center text-sm text-gray-300"
        >
          Starting camera…
        </div>
        <div
          v-else
          class="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/70"
        />
      </div>
      <p
        v-else
        class="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        role="alert"
      >
        {{ error }}
      </p>

      <p
        v-if="mode === 'import' && scannedCodes > 0 && !error"
        class="mt-3 text-sm font-medium text-gray-700 tabular-nums dark:text-gray-300"
        role="status"
      >
        {{ accounts }} {{ accounts === 1 ? 'account' : 'accounts' }} found<template
          v-if="batchTotal"
        >
          · QR code {{ scannedCodes }} of {{ batchTotal }}</template
        >
      </p>
      <p
        v-if="notice && !error"
        class="mt-2 text-xs text-amber-600 dark:text-amber-400"
        role="status"
      >
        {{ notice }}
      </p>

      <div class="mt-5 flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-gray-900/5 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/9 cursor-pointer dark:bg-white/8 dark:text-gray-100 dark:hover:bg-white/12"
          @click="emit('close')"
        >
          {{ mode === 'import' && scannedCodes > 0 ? 'Done' : 'Cancel' }}
        </button>
      </div>
    </div>
  </div>
</template>

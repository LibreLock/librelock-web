import { computed, ref } from 'vue'

import { API_BASE_URL } from '@/constants'

export const isOnline = ref(navigator.onLine !== false)
export const isServerReachable = ref(true)
export const isProbing = ref(false)

export const isOffline = computed(() => !isOnline.value || !isServerReachable.value)

export function markServerReachable() {
  isServerReachable.value = true
}

export function markServerUnreachable() {
  isServerReachable.value = false
}

export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|Loading chunk/i.test(message)
}

const PROBE_TIMEOUT_MS = 8000

export async function probeServer(): Promise<boolean> {
  isProbing.value = true
  try {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
    // Any answer at all - even an error status - proves something is listening
    await fetch(`${baseUrl}/version`, {
      cache: 'no-store',
      credentials: 'include',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    isOnline.value = true
    markServerReachable()
    return true
  } catch {
    markServerUnreachable()
    return false
  } finally {
    isProbing.value = false
  }
}

window.addEventListener('online', () => {
  isOnline.value = true
  void probeServer()
})

window.addEventListener('offline', () => {
  isOnline.value = false
})

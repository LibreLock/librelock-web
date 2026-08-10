<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import IconPadlock from '@/components/icons/IconPadlock.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { APP_NAME } from '@/constants'
import { isOnline, isProbing, probeServer } from '@/services/connectivity'

// 'screen' replaces the whole app when boot never got far enough to render a route;
// 'banner' rides on top of an app that is already up but has lost the server since
const props = withDefaults(defineProps<{ variant?: 'screen' | 'banner' }>(), { variant: 'screen' })

const reloading = ref(false)

const heading = computed(() => (isOnline.value ? `Cannot reach ${APP_NAME}` : 'You are offline'))

const detail = computed(() =>
  isOnline.value
    ? `The ${APP_NAME} server is not responding. If this instance is only reachable over a VPN (Tailscale, WireGuard, ...), check that the connection is up.`
    : 'This device has no network connection. Your vault stays encrypted and untouched until it is back.',
)

async function retry() {
  if (isProbing.value || reloading.value) return
  const reachable = await probeServer()
  // The aborted navigation left the router with nowhere to go, so a reload is what actually
  // resumes the app; the banner's view is still mounted and just carries on
  if (reachable && props.variant === 'screen') {
    reloading.value = true
    window.location.reload()
  }
}

// Nothing on the full screen is usable, so get back in on our own as soon as the server answers
// instead of making the user sit on the button
const RETRY_INTERVAL_MS = 10000
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (props.variant !== 'screen') return
  timer = setInterval(() => void retry(), RETRY_INTERVAL_MS)
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div
    v-if="props.variant === 'screen'"
    class="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gray-50 dark:bg-gray-950"
  >
    <IconPadlock size="lg" />

    <div class="max-w-md text-center">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ heading }}</h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ detail }}</p>
    </div>

    <button
      type="button"
      :disabled="isProbing || reloading"
      class="flex items-center justify-center gap-2 rounded-md bg-gray-800 hover:bg-gray-700 px-5 py-2 font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      @click="retry"
    >
      <LoadingSpinner v-if="isProbing || reloading" size="sm" />
      {{ isProbing || reloading ? 'Checking...' : 'Try again' }}
    </button>

    <p class="text-xs text-gray-400 dark:text-gray-500">Retrying automatically every 10 seconds.</p>
  </div>

  <div
    v-else
    role="status"
    class="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
  >
    <div
      class="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/90 dark:text-amber-400"
    >
      <span>{{ isOnline ? `Cannot reach ${APP_NAME}.` : 'You are offline.' }}</span>
      <button
        type="button"
        :disabled="isProbing"
        class="flex items-center gap-1.5 font-semibold underline underline-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        @click="retry"
      >
        <LoadingSpinner v-if="isProbing" size="sm" />
        Retry
      </button>
    </div>
  </div>
</template>

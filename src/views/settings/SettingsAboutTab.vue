<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getServerVersion } from '@/api/version'
import { APP_NAME, APP_VERSION } from '@/constants'

const serverVersion = ref<string | null>(null)
const loading = ref(true)

// App and server are built and deployed separately, so they can drift - an upgraded API behind a
// stale cached bundle is the case worth surfacing. `dev` means an unreleased local build, so it
// never counts as a mismatch
const mismatch = computed(() => {
  const remote = serverVersion.value
  if (!remote || remote === 'dev' || APP_VERSION === 'dev') return false
  return remote !== APP_VERSION
})

onMounted(async () => {
  try {
    serverVersion.value = (await getServerVersion())?.version ?? null
  } catch {
    serverVersion.value = null
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">About</h2>
        <p class="mt-0.5 text-sm text-gray-400">Versions running on this installation</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <dl class="px-4 sm:px-6 py-5 space-y-3 text-sm">
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">{{ APP_NAME }}</dt>
          <dd class="font-medium text-gray-900 dark:text-gray-100">v{{ APP_VERSION }}</dd>
        </div>

        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">Server</dt>
          <dd class="font-medium text-gray-900 dark:text-gray-100">
            <span v-if="loading" class="text-gray-400">Checking…</span>
            <span v-else-if="!serverVersion" class="text-gray-400">Unavailable</span>
            <span v-else>v{{ serverVersion }}</span>
          </dd>
        </div>
      </dl>

      <div v-if="mismatch" class="px-4 sm:px-6 pb-5">
        <p
          class="rounded-lg bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          The app and the server are on different versions. Reload the page to pick up the current
          app; if that does not clear it, one of the two still needs upgrading.
        </p>
      </div>
    </div>
  </div>
</template>

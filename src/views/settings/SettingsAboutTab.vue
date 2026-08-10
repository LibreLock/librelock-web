<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getServerVersion } from '@/api/version'
import { APP_HELP_URL, APP_NAME, APP_REPO_URL, APP_VERSION } from '@/constants'

const serverVersion = ref<string | null>(null)
const loading = ref(true)

// One release tags both the app and the server, so normally there is a single version to show.
// They are still deployed as two containers and can drift - an upgraded API behind a stale cached
// bundle is the case worth surfacing. `dev` means an unreleased local build, never a mismatch
const mismatch = computed(() => {
  const remote = serverVersion.value
  if (!remote || remote === 'dev' || APP_VERSION === 'dev') return false
  return remote !== APP_VERSION
})

// Split the two apart only when they disagree or the server cannot be reached
const unified = computed(() => !loading.value && !mismatch.value && serverVersion.value !== null)

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
        <p class="mt-0.5 text-sm text-gray-400">Version running on this installation</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <dl class="px-4 sm:px-6 py-5 space-y-3 text-sm">
        <div v-if="unified" class="flex items-baseline justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">{{ APP_NAME }}</dt>
          <dd class="font-medium text-gray-900 dark:text-gray-100">{{ APP_VERSION }}</dd>
        </div>

        <template v-else>
          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">App</dt>
            <dd class="font-medium text-gray-900 dark:text-gray-100">{{ APP_VERSION }}</dd>
          </div>

          <div class="flex items-baseline justify-between gap-4">
            <dt class="text-gray-500 dark:text-gray-400">Server</dt>
            <dd class="font-medium text-gray-900 dark:text-gray-100">
              <span v-if="loading" class="text-gray-400">Checking…</span>
              <span v-else-if="!serverVersion" class="text-gray-400">Unavailable</span>
              <span v-else>{{ serverVersion }}</span>
            </dd>
          </div>
        </template>

        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">Source code</dt>
          <dd>
            <a
              :href="APP_REPO_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex max-w-full items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                class="h-4 w-4 shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span class="truncate">github.com/librelock</span>
            </a>
          </dd>
        </div>

        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-gray-500 dark:text-gray-400">Help</dt>
          <dd>
            <a
              :href="APP_HELP_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex max-w-full items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                class="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span class="truncate">Documentation</span>
            </a>
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

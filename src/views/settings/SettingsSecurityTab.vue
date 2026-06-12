<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiRequest } from '@/services/api'
import { useAuthStore, type KdfResponse } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { DB_NAME, KEY_ID, SESSION_FLAG, STORE } from '@/constants'

const auth = useAuthStore()

const kdfInfo = ref<KdfResponse | null>(null)
const kdfLoading = ref(false)

async function loadKdfInfo() {
  if (kdfInfo.value || kdfLoading.value || !auth.user?.username) return
  kdfLoading.value = true
  try {
    const data = await apiRequest<KdfResponse>(
      `/auth/kdf?username=${encodeURIComponent(auth.user.username)}`,
    )
    kdfInfo.value = data ?? null
  } catch {
    // static info still shown
  } finally {
    kdfLoading.value = false
  }
}

function formatMemory(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`
  if (kb >= 1024) return `${Math.round(kb / 1024)} MB`
  return `${kb} KB`
}

watch(
  () => auth.user?.username,
  (username) => {
    if (username) loadKdfInfo()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div class="px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-slate-800 dark:text-slate-200">Security & Storage</h2>
        <p class="mt-0.5 text-sm text-slate-400">View cryptography and key storage details</p>
      </div>
      <hr class="mt-4 border-slate-100 dark:border-slate-700" />
      <div class="px-6 py-2 divide-y divide-slate-100 dark:divide-slate-700">
        <div class="py-3">
          <h3 class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">Cryptography</h3>
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">Vault cipher</span>
              <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                >AES-GCM · 256-bit</code
              >
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">KDF algorithm</span>
              <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{
                kdfInfo?.kdf_algo
              }}</code>
            </div>
            <template v-if="kdfLoading">
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">KDF params</span>
                <span class="flex items-center gap-2 text-xs text-slate-400">
                  <LoadingSpinner size="sm" />
                  Loading…
                </span>
              </div>
            </template>
            <template v-else-if="kdfInfo">
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">Iterations</span>
                <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{
                  kdfInfo.kdf_iter
                }}</code>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">Memory</span>
                <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{
                  formatMemory(kdfInfo.kdf_memory)
                }}</code>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">Parallelism</span>
                <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">{{
                  kdfInfo.kdf_parallelism
                }}</code>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500 sm:pt-0.5"
                  >KDF salt</span
                >
                <code
                  class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded break-all"
                  >{{ kdfInfo.kdf_salt }}</code
                >
              </div>
            </template>
          </div>
        </div>

        <div class="py-3">
          <h3 class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-4">Key Storage</h3>
          <div class="space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500 sm:pt-0.5"
                >Master key</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                  >JavaScript heap (in-memory)</code
                >
              </div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500 sm:pt-0.5"
                >Session key</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                  >IndexedDB > {{ DB_NAME }} > {{ STORE }} > {{ KEY_ID }}</code
                >
              </div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500">Session flag</span>
              <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                >sessionStorage["{{ SESSION_FLAG }}"]</code
              >
            </div>
            <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <span class="sm:w-36 sm:shrink-0 text-xs font-medium text-slate-500 sm:pt-0.5"
                >Auth session</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                  >HttpOnly cookie (server-managed)</code
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

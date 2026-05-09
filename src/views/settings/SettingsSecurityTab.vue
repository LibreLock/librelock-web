<script setup lang="ts">
import { ref, watch } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL, DB_NAME, KEY_ID, SESSION_FLAG, STORE } from '@/constants'

const auth = useAuthStore()

// KDF Info
interface KdfInfo {
  kdf_algo?: string
  kdf_iter: number
  kdf_memory: number
  kdf_parallelism: number
  kdf_salt: string
}

const kdfInfo = ref<KdfInfo | null>(null)
const kdfLoading = ref(false)

async function loadKdfInfo() {
  if (kdfInfo.value || kdfLoading.value || !auth.user?.username) return
  kdfLoading.value = true
  try {
    const data = await apiRequest<KdfInfo>(
      `/auth/kdf?username=${encodeURIComponent(auth.user.username)}`,
    )
    kdfInfo.value = data ?? null
  } catch {
    // static info still shown
  } finally {
    kdfLoading.value = false
  }
}

// Backend URL
const backendUrl = ref(API_BASE_URL)
const backendError = ref<string | null>(null)
const backendSuccess = ref(false)
const isSavingBackend = ref(false)

async function handleSaveBackendUrl() {
  backendError.value = null
  backendSuccess.value = false
  isSavingBackend.value = true
  try {
    // TODO: Implement backend endpoint to save the API URL preference
    // For now, this would store it locally or in settings
    backendSuccess.value = true
  } catch (err) {
    backendError.value = err instanceof ApiError ? err.message : 'Failed to update backend URL.'
  } finally {
    isSavingBackend.value = false
  }
}

// Utilities
function formatMemory(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`
  if (kb >= 1024) return `${Math.round(kb / 1024)} MB`
  return `${kb} KB`
}

// Load KDF info when component mounts
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
    <!-- Server -->
    <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div class="px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-slate-800">Server</h2>
        <p class="mt-0.5 text-sm text-slate-400">Configure server settings</p>
      </div>
      <hr class="mt-3 border-slate-100" />
      <div class="px-6 py-5">
        <div class="space-y-4">
          <label class="mb-1 block text-xs font-semibold text-slate-500">API endpoint</label>
          <input
            v-model="backendUrl"
            type="url"
            class="w-full rounded-md border px-3 py-1.5 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
          />
          <p v-if="backendError" class="mt-1.5 text-sm text-rose-600">{{ backendError }}</p>
          <p v-if="backendSuccess" class="mt-1.5 text-sm text-emerald-600">Backend URL updated</p>
          <button
            type="button"
            class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            :disabled="isSavingBackend"
            @click="handleSaveBackendUrl"
          >
            {{ isSavingBackend ? 'Saving…' : 'Update URL' }}
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div class="px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-slate-800">Security & Storage</h2>
        <p class="mt-0.5 text-sm text-slate-400">View cryptography and key storage details</p>
      </div>
      <hr class="mt-4 border-slate-100" />
      <div class="px-6 py-2 divide-y divide-slate-100">
        <div class="py-3">
          <h3 class="text-xs font-semibold text-slate-600 mb-4">Cryptography</h3>
          <div class="space-y-3">
            <div class="flex items-center gap-4">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Vault cipher</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                >AES-GCM · 256-bit</code
              >
            </div>
            <div class="flex items-center gap-4">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">KDF algorithm</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                kdfInfo?.kdf_algo ?? 'Argon2id'
              }}</code>
            </div>
            <template v-if="kdfLoading">
              <div class="flex items-center gap-4">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">KDF params</span>
                <span class="text-xs text-slate-400">Loading…</span>
              </div>
            </template>
            <template v-else-if="kdfInfo">
              <div class="flex items-center gap-4">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Iterations</span>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                  kdfInfo.kdf_iter
                }}</code>
              </div>
              <div class="flex items-center gap-4">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Memory</span>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                  formatMemory(kdfInfo.kdf_memory)
                }}</code>
              </div>
              <div class="flex items-center gap-4">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Parallelism</span>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                  kdfInfo.kdf_parallelism
                }}</code>
              </div>
              <div class="flex items-start gap-4">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                  >KDF salt</span
                >
                <code
                  class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded break-all"
                  >{{ kdfInfo.kdf_salt }}</code
                >
              </div>
            </template>
          </div>
        </div>

        <div class="py-3">
          <h3 class="text-xs font-semibold text-slate-600 mb-4">Key Storage</h3>
          <div class="space-y-3">
            <div class="flex items-start gap-4">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                >Master key</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                  >JavaScript heap (in-memory)</code
                >
              </div>
            </div>
            <div class="flex items-start gap-4">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                >Session key</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                  >IndexedDB > {{ DB_NAME }} > {{ STORE }} > {{ KEY_ID }}</code
                >
              </div>
            </div>
            <div class="flex items-center gap-4">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Session flag</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                >sessionStorage["{{ SESSION_FLAG }}"]</code
              >
            </div>
            <div class="flex items-start gap-4">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                >Auth session</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
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

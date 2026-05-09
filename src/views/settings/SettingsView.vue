<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL, DB_NAME, KEY_ID, SESSION_FLAG, STORE } from '@/constants'

const auth = useAuthStore()

type Tab = 'account' | 'security' | 'sessions'
const activeTab = ref<Tab>('account')

// Account tab
const editUsername = ref(auth.user?.username ?? '')
const usernameError = ref<string | null>(null)
const usernameSuccess = ref(false)
const isSavingUsername = ref(false)

async function handleSaveUsername() {
  usernameError.value = null
  usernameSuccess.value = false
  isSavingUsername.value = true
  try {
    await apiRequest('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ username: editUsername.value.trim() }),
    })
    await auth.refreshSession()
    usernameSuccess.value = true
  } catch (err) {
    usernameError.value = err instanceof ApiError ? err.message : 'Failed to update username.'
  } finally {
    isSavingUsername.value = false
  }
}

// Security tab
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

// Sessions tab
interface Session {
  id: string
  created_at: string
  last_seen_at?: string
  expires_at?: string
  ip_address?: string
  user_agent?: string
  is_current?: boolean
}

const sessions = ref<Session[]>([])
const sessionsLoading = ref(false)
const sessionsError = ref<string | null>(null)
const revokingId = ref<string | null>(null)

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = null
  try {
    const data = await apiRequest<Session[]>('/auth/sessions')
    sessions.value = data ?? []
  } catch (err) {
    sessionsError.value = err instanceof ApiError ? err.message : 'Failed to load sessions.'
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeSession(id: string) {
  revokingId.value = id
  try {
    await apiRequest(`/auth/sessions/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter((s) => s.id !== id)
  } catch (err) {
    sessionsError.value = err instanceof ApiError ? err.message : 'Failed to revoke session.'
  } finally {
    revokingId.value = null
  }
}

function onTabChange(tab: Tab) {
  activeTab.value = tab
  if (tab === 'security') loadKdfInfo()
  if (tab === 'sessions') loadSessions()
}

// Change password tab
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSuccess = ref(false)
const isChangingPassword = ref(false)
const newPasswordFocused = ref(false)
const showNewPassword = ref(false)

const MIN_PASSWORD_LENGTH = 12

const hasUpper = computed(() => /[A-Z]/.test(newPassword.value))
const hasLower = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /[0-9]/.test(newPassword.value))
const hasSymbol = computed(() => /[^A-Za-z0-9]/.test(newPassword.value))
const passwordMinOk = computed(() => newPassword.value.length >= MIN_PASSWORD_LENGTH)
const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && newPassword.value !== confirmPassword.value,
)
const canSubmit = computed(
  () =>
    !isChangingPassword.value &&
    currentPassword.value.length > 0 &&
    hasUpper.value &&
    hasLower.value &&
    hasNumber.value &&
    hasSymbol.value &&
    passwordMinOk.value &&
    !passwordMismatch.value,
)

async function handleChangePassword() {
  passwordError.value = null
  isChangingPassword.value = true
  try {
    await apiRequest('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: currentPassword.value,
        new_password: newPassword.value,
      }),
    })
    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    passwordError.value = err instanceof ApiError ? err.message : 'Failed to change password.'
  } finally {
    isChangingPassword.value = false
  }
}

// Utilities
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function formatMemory(kb: number): string {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`
  if (kb >= 1024) return `${Math.round(kb / 1024)} MB`
  return `${kb} KB`
}

function shortUserAgent(ua: string): string {
  if (!ua) return 'Unknown device'
  const m = ua.match(/(Firefox|Chrome|Edg|Safari|OPR)\/(\d+)/)
  if (m) {
    const name = m[1] === 'Edg' ? 'Edge' : m[1] === 'OPR' ? 'Opera' : m[1]
    return `${name} ${m[2]}`
  }
  return ua.length > 32 ? ua.slice(0, 32) + '…' : ua
}
</script>

<template>
  <div class="overflow-y-auto h-full p-6">
    <div class="max-w-2xl">
      <h1 class="text-2xl font-semibold text-slate-900">Settings</h1>
      <p class="mt-1 mb-6 text-sm text-slate-400">Manage your account and security preferences.</p>

      <!-- Tabs -->
      <div class="mb-6 flex gap-1 border-b border-slate-200">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'account'
              ? 'border-slate-800 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          "
          @click="onTabChange('account')"
        >
          Account
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'security'
              ? 'border-slate-800 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          "
          @click="onTabChange('security')"
        >
          Security
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'sessions'
              ? 'border-slate-800 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          "
          @click="onTabChange('sessions')"
        >
          Sessions
        </button>
      </div>

      <!-- Account tab -->
      <div v-if="activeTab === 'account'" class="space-y-4">
        <!-- Profile -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div class="px-6 pt-6 pb-1">
            <h2 class="text-base font-semibold text-slate-800">Profile</h2>
            <p class="mt-0.5 text-sm text-slate-400">Update your display name.</p>
          </div>

          <hr class="mt-5 border-slate-100" />

          <div class="px-6 py-5">
            <form class="space-y-4" @submit.prevent="handleSaveUsername">
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-500">Display name</label>
                <input
                  v-model="editUsername"
                  type="text"
                  placeholder="Your username"
                  class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                />
              </div>

              <p v-if="usernameError" class="text-sm text-rose-600">{{ usernameError }}</p>
              <p v-if="usernameSuccess" class="text-sm text-emerald-600">Username updated.</p>

              <button
                type="submit"
                class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                :disabled="isSavingUsername || !editUsername.trim()"
              >
                {{ isSavingUsername ? 'Saving…' : 'Save changes' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Master password -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div class="px-6 pt-6 pb-1">
            <h2 class="text-base font-semibold text-slate-800">Master password</h2>
            <p class="mt-0.5 text-sm text-slate-400">
              Change the password used to unlock your vault.
            </p>
          </div>

          <hr class="mt-5 border-slate-100" />

          <div class="px-6 py-5">
            <div
              v-if="passwordSuccess"
              class="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              Master password updated successfully.
            </div>

            <form v-else class="space-y-4" @submit.prevent="handleChangePassword">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500"
                    >Current password</label
                  >
                  <input
                    v-model="currentPassword"
                    type="password"
                    required
                    autocomplete="current-password"
                    class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500"
                    >Confirm new password</label
                  >
                  <input
                    v-model="confirmPassword"
                    type="password"
                    required
                    autocomplete="new-password"
                    class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                  <p v-if="passwordMismatch" class="mt-1.5 text-xs text-rose-600">
                    Passwords do not match.
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-500">New password</label>
                <div class="relative">
                  <input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    required
                    autocomplete="new-password"
                    class="w-full rounded-md border px-3 py-1 pr-10 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    @focus="newPasswordFocused = true"
                    @blur="newPasswordFocused = false"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <svg
                      v-if="showNewPassword"
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                </div>

                <div
                  v-if="newPasswordFocused || newPassword.length > 0"
                  class="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs"
                >
                  <span :class="hasUpper ? 'text-emerald-600' : 'text-slate-400'"
                    >{{ hasUpper ? '✓' : '○' }} Uppercase</span
                  >
                  <span :class="hasLower ? 'text-emerald-600' : 'text-slate-400'"
                    >{{ hasLower ? '✓' : '○' }} Lowercase</span
                  >
                  <span :class="hasNumber ? 'text-emerald-600' : 'text-slate-400'"
                    >{{ hasNumber ? '✓' : '○' }} Number</span
                  >
                  <span :class="hasSymbol ? 'text-emerald-600' : 'text-slate-400'"
                    >{{ hasSymbol ? '✓' : '○' }} Symbol</span
                  >
                  <span :class="passwordMinOk ? 'text-emerald-600' : 'text-slate-400'"
                    >{{ passwordMinOk ? '✓' : '○' }} {{ MIN_PASSWORD_LENGTH }}+ chars</span
                  >
                </div>
              </div>

              <p v-if="passwordError" class="text-sm text-rose-600">{{ passwordError }}</p>

              <button
                type="submit"
                class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                :disabled="!canSubmit"
              >
                {{ isChangingPassword ? 'Saving…' : 'Update password' }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Security tab -->
      <div v-if="activeTab === 'security'" class="space-y-4">
        <!-- Instance -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div class="px-6 pt-5 pb-1">
            <h2 class="text-base font-semibold text-slate-800">Instance</h2>
          </div>
          <hr class="mt-4 border-slate-100" />
          <div class="px-6 py-2 divide-y divide-slate-100">
            <div class="flex items-center gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">API endpoint</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                API_BASE_URL
              }}</code>
            </div>
            <div v-if="auth.user?.id" class="flex items-center gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">User ID</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                auth.user.id
              }}</code>
            </div>
          </div>
        </div>

        <!-- Cryptography -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div class="px-6 pt-5 pb-1">
            <h2 class="text-base font-semibold text-slate-800">Cryptography</h2>
          </div>
          <hr class="mt-4 border-slate-100" />
          <div class="px-6 py-2 divide-y divide-slate-100">
            <div class="flex items-center gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Vault cipher</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                >AES-GCM · 256-bit</code
              >
            </div>
            <div class="flex items-center gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">KDF algorithm</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                kdfInfo?.kdf_algo ?? 'Argon2id'
              }}</code>
            </div>
            <template v-if="kdfLoading">
              <div class="flex items-center gap-4 py-3">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">KDF params</span>
                <span class="text-xs text-slate-400">Loading…</span>
              </div>
            </template>
            <template v-else-if="kdfInfo">
              <div class="flex items-center gap-4 py-3">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Iterations</span>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                  kdfInfo.kdf_iter
                }}</code>
              </div>
              <div class="flex items-center gap-4 py-3">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Memory</span>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                  formatMemory(kdfInfo.kdf_memory)
                }}</code>
              </div>
              <div class="flex items-center gap-4 py-3">
                <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Parallelism</span>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded">{{
                  kdfInfo.kdf_parallelism
                }}</code>
              </div>
              <div class="flex items-start gap-4 py-3">
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

        <!-- Key storage -->
        <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div class="px-6 pt-5 pb-1">
            <h2 class="text-base font-semibold text-slate-800">Key storage</h2>
          </div>
          <hr class="mt-4 border-slate-100" />
          <div class="px-6 py-2 divide-y divide-slate-100">
            <div class="flex items-start gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                >Master key</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                  >JavaScript heap (in-memory)</code
                >
                <p class="mt-1 text-xs text-slate-400">Cleared when the tab is closed.</p>
              </div>
            </div>
            <div class="flex items-start gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                >Session key</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                  >IndexedDB > {{ DB_NAME }} > {{ STORE }} > {{ KEY_ID }}</code
                >
                <p class="mt-1 text-xs text-slate-400">
                  Survives page refresh within the same browser session.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500">Session flag</span>
              <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                >sessionStorage["{{ SESSION_FLAG }}"]</code
              >
            </div>
            <div class="flex items-start gap-4 py-3">
              <span class="w-36 shrink-0 text-xs font-medium text-slate-500 pt-0.5"
                >Auth session</span
              >
              <div>
                <code class="text-xs font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded"
                  >HttpOnly cookie (server-managed)</code
                >
                <p class="mt-1 text-xs text-slate-400">
                  JWT in an HttpOnly cookie - not readable from JavaScript.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions tab -->
      <div
        v-if="activeTab === 'sessions'"
        class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
      >
        <div class="px-6 pt-6 pb-1 flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-800">Active sessions</h2>
            <p class="mt-0.5 text-sm text-slate-400">
              All devices currently logged in to your account.
            </p>
          </div>
          <button
            type="button"
            class="text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            :disabled="sessionsLoading"
            @click="loadSessions"
          >
            Refresh
          </button>
        </div>

        <hr class="mt-5 border-slate-100" />

        <div class="px-6 py-5">
          <!-- Loading -->
          <div
            v-if="sessionsLoading"
            class="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"
          >
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Loading sessions…
          </div>

          <!-- Error -->
          <div
            v-else-if="sessionsError"
            class="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600"
          >
            {{ sessionsError }}
          </div>

          <!-- Empty -->
          <div v-else-if="sessions.length === 0" class="py-8 text-center text-sm text-slate-400">
            No active sessions found.
          </div>

          <!-- List -->
          <div v-else class="space-y-2">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-start gap-5 rounded-lg border px-4 py-3.5"
              :class="session.is_current ? 'border-slate-300 bg-slate-50' : 'border-slate-200'"
            >
              <!-- Device -->
              <div class="w-36 shrink-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <span class="text-sm font-medium text-slate-800">{{
                    shortUserAgent(session.user_agent ?? '')
                  }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="session.is_current"
                    class="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white"
                    >current</span
                  >
                  <code class="text-[11px] font-mono text-slate-300 truncate">{{
                    session.id
                  }}</code>
                </div>
              </div>

              <!-- Metadata -->
              <div class="flex-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-slate-400 pt-0.5">
                <span v-if="session.ip_address"
                  ><span class="text-slate-500">IP</span> {{ session.ip_address }}</span
                >
                <span
                  ><span class="text-slate-500">Created</span>
                  {{ formatDate(session.created_at) }}</span
                >
                <span v-if="session.last_seen_at"
                  ><span class="text-slate-500">Last active</span>
                  {{ formatDate(session.last_seen_at) }}</span
                >
                <span v-if="session.expires_at"
                  ><span class="text-slate-500">Expires</span>
                  {{ formatDate(session.expires_at) }}</span
                >
              </div>

              <!-- Actions -->
              <div class="shrink-0 pt-0.5">
                <button
                  v-if="!session.is_current"
                  type="button"
                  class="text-xs text-rose-500 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                  :disabled="revokingId === session.id"
                  @click="revokeSession(session.id)"
                >
                  {{ revokingId === session.id ? 'Revoking…' : 'Revoke' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

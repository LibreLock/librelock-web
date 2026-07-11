<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import router from '@/router'

interface Session {
  id: string
  user_id: string
  token_hash: string
  device_name: string
  ip: string
  created_at: string
  last_used_at: string
  expires_at: string
}

interface SessionsResponse {
  sessions: Session[]
}

const sessions = ref<Session[]>([])
const sessionsLoading = ref(false)
const sessionsError = ref<string | null>(null)
const revokingId = ref<string | null>(null)
const revokingAll = ref(false)

const showLogoutWarning = ref(false)
const logoutWarningMode = ref<'revokeAll' | 'revokeOne'>('revokeAll')
const pendingRevokeId = ref<string | null>(null)

async function confirmLogoutWarning() {
  showLogoutWarning.value = false
  if (logoutWarningMode.value === 'revokeAll') {
    doRevokeAll()
  } else if (pendingRevokeId.value) {
    const id = pendingRevokeId.value
    pendingRevokeId.value = null
    await doRevokeSession(id)
    const auth = useAuthStore()
    await auth.logOut()
    router.push('/login')
  }
}

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = null
  try {
    const data = await apiRequest<SessionsResponse>('/sessions')
    // Drop expired sessions
    // The list is labelled "Active sessions", and the backend may return rows that are past expires_at but not yet purged
    const now = Date.now()
    sessions.value = (data?.sessions ?? []).filter(
      (s) => !s.expires_at || new Date(s.expires_at).getTime() > now,
    )
  } catch (err) {
    sessionsError.value = err instanceof ApiError ? err.message : 'Failed to load sessions.'
  } finally {
    sessionsLoading.value = false
  }
}

function revokeSession(id: string) {
  if (sessions.value.length === 1) {
    pendingRevokeId.value = id
    logoutWarningMode.value = 'revokeOne'
    showLogoutWarning.value = true
  } else {
    doRevokeSession(id).then(checkCurrentSession)
  }
}

async function checkCurrentSession() {
  try {
    await apiRequest('/auth/me')
  } catch {
    const auth = useAuthStore()
    await auth.logOut()
    router.push('/login')
  }
}

async function doRevokeSession(id: string) {
  revokingId.value = id
  try {
    await apiRequest(`/sessions/${id}`, { method: 'DELETE' })
    sessions.value = sessions.value.filter((s) => s.id !== id)
    sessionsError.value = null
  } catch (err) {
    sessionsError.value = err instanceof ApiError ? err.message : 'Failed to revoke session.'
  } finally {
    revokingId.value = null
  }
}

function revokeAllSessions() {
  logoutWarningMode.value = 'revokeAll'
  showLogoutWarning.value = true
}

async function doRevokeAll() {
  const auth = useAuthStore()
  revokingAll.value = true
  try {
    await apiRequest('/sessions', { method: 'DELETE' })
    sessions.value = []
    sessionsError.value = null
    await auth.logOut()
  } catch (err) {
    sessionsError.value = err instanceof ApiError ? err.message : 'Failed to revoke all sessions.'
  } finally {
    revokingAll.value = false
    router.push('/login')
  }
}

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

function shortDeviceName(deviceName: string): string {
  if (!deviceName) return 'Unknown device'
  const m = deviceName.match(/(Firefox|Chrome|Edg|Safari|OPR)\/(\d+)/)
  if (m) {
    const name = m[1] === 'Edg' ? 'Edge' : m[1] === 'OPR' ? 'Opera' : m[1]
    return `${name} ${m[2]}`
  }
  return deviceName.length > 32 ? deviceName.slice(0, 32) + '…' : deviceName
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && !sessionsLoading.value) {
    loadSessions()
  }
}

onMounted(() => {
  loadSessions()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
  >
    <div class="px-6 pt-6 pb-1 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Active sessions</h2>
        <p class="mt-0.5 text-sm text-gray-400">All devices currently logged in to your account</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="sessions.length > 1"
          type="button"
          class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 mr-2 transition-colors cursor-pointer disabled:opacity-50"
          :disabled="revokingAll"
          @click="revokeAllSessions"
        >
          {{ revokingAll ? 'Revoking…' : 'Revoke all' }}
        </button>
        <button
          type="button"
          class="text-xs text-gray-500 dark:text-gray-400 mr-4 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer disabled:opacity-50"
          :disabled="sessionsLoading"
          @click="loadSessions"
        >
          Refresh
        </button>
      </div>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-gray-700" />

    <div class="px-6 py-5">
      <div
        v-if="sessionsLoading"
        class="flex items-center justify-center gap-2 py-8 text-sm text-gray-400"
      >
        <LoadingSpinner size="sm" />
        Loading sessions…
      </div>

      <div
        v-else-if="sessionsError"
        class="rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400"
      >
        {{ sessionsError }}
      </div>

      <div v-else-if="sessions.length === 0" class="py-8 text-center text-sm text-gray-400">
        No active sessions found.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-4"
        >
          <div class="flex items-center justify-between sm:block sm:w-22 sm:shrink-0">
            <span
              class="text-sm font-medium text-gray-800 dark:text-gray-200"
              :title="`Session ID: ${session.id}`"
              >{{ shortDeviceName(session.device_name) }}</span
            >
            <button
              type="button"
              class="sm:hidden text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
              :disabled="revokingId === session.id"
              @click="revokeSession(session.id)"
            >
              {{ revokingId === session.id ? 'Revoking…' : 'Revoke' }}
            </button>
          </div>

          <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
            <span v-if="session.ip"><span class="text-gray-500">IP:</span> {{ session.ip }}</span>
            <span
              ><span class="text-gray-500">Created:</span>
              {{ formatDate(session.created_at) }}</span
            >
            <span v-if="session.last_used_at"
              ><span class="text-gray-500">Last active:</span>
              {{ formatDate(session.last_used_at) }}</span
            >
            <span v-if="session.expires_at"
              ><span class="text-gray-500">Expires:</span>
              {{ formatDate(session.expires_at) }}</span
            >
          </div>

          <div class="hidden sm:block shrink-0 pt-0.5">
            <button
              type="button"
              class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
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

  <div
    v-if="showLogoutWarning"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
    @click.self="showLogoutWarning = false"
  >
    <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
      <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
        {{ logoutWarningMode === 'revokeAll' ? 'Revoke all sessions?' : 'Revoke this session?' }}
      </h2>
      <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
        {{
          logoutWarningMode === 'revokeAll'
            ? 'All sessions will be revoked. You will be logged out of this device.'
            : 'This is your only active session. You will be logged out of this device.'
        }}
      </p>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
          @click="showLogoutWarning = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 cursor-pointer transition-colors"
          @click="confirmLogoutWarning"
        >
          Revoke
        </button>
      </div>
    </div>
  </div>
</template>

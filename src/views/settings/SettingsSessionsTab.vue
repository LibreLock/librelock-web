<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import router from '@/router'
import PaginationBar from '@/components/PaginationBar.vue'
import { usePagination } from '@/composables/usePagination'
import { PhArrowClockwise, PhDesktop, PhDeviceMobile } from '@phosphor-icons/vue'

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
const { page, pageSize, paged: pagedSessions } = usePagination(sessions, 8)
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

function isMobile(deviceName: string): boolean {
  return /Android|iPhone|iPad|Mobile/i.test(deviceName)
}

function relativeTime(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (Number.isNaN(diff)) return dateStr
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 1) return 'just now'
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
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
    class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07]"
  >
    <div class="px-4 sm:px-6 pt-6 pb-1 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Active sessions</h2>
        <p class="mt-0.5 text-sm text-gray-400">All devices currently logged in to your account</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="sessions.length > 1"
          type="button"
          class="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 cursor-pointer disabled:opacity-50"
          :disabled="revokingAll"
          @click="revokeAllSessions"
        >
          {{ revokingAll ? 'Revoking…' : 'Revoke all' }}
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-900/[0.05] hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-100 cursor-pointer disabled:opacity-50"
          :disabled="sessionsLoading"
          @click="loadSessions"
        >
          <PhArrowClockwise
            :size="14"
            weight="bold"
            class="transition-transform duration-500"
            :class="{ 'animate-spin': sessionsLoading }"
          />
          Refresh
        </button>
      </div>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-white/[0.08]" />

    <div class="px-4 sm:px-6 py-5">
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

      <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.08]">
        <div
          v-for="session in pagedSessions"
          :key="session.id"
          class="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900/[0.05] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400"
          >
            <PhDeviceMobile v-if="isMobile(session.device_name)" :size="20" />
            <PhDesktop v-else :size="20" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline gap-x-2">
              <span
                class="text-sm font-medium text-gray-800 dark:text-gray-200"
                :title="`Session ID: ${session.id}`"
                >{{ shortDeviceName(session.device_name) }}</span
              >
              <span v-if="session.ip" class="font-mono text-xs text-gray-400">{{
                session.ip
              }}</span>
            </div>
            <p class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400">
              <span v-if="session.last_used_at" :title="formatDate(session.last_used_at)"
                >Active {{ relativeTime(session.last_used_at) }}</span
              >
              <span :title="formatDate(session.created_at)"
                >Signed in {{ relativeTime(session.created_at) }}</span
              >
              <span v-if="session.expires_at" :title="formatDate(session.expires_at)"
                >Expires {{ relativeTime(session.expires_at) }}</span
              >
            </p>
          </div>

          <button
            type="button"
            class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400 cursor-pointer disabled:opacity-50"
            :disabled="revokingId === session.id"
            @click="revokeSession(session.id)"
          >
            {{ revokingId === session.id ? 'Revoking…' : 'Revoke' }}
          </button>
        </div>
        <PaginationBar
          v-model:page="page"
          :page-size="pageSize"
          :total="sessions.length"
          class="pt-4"
        />
      </div>
    </div>
  </div>

  <div
    v-if="showLogoutWarning"
    class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
    @click.self="showLogoutWarning = false"
  >
    <div
      class="max-w-sm w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
    >
      <h2 class="mb-1.5 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
        {{ logoutWarningMode === 'revokeAll' ? 'Revoke all sessions?' : 'Revoke this session?' }}
      </h2>
      <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {{
          logoutWarningMode === 'revokeAll'
            ? 'All sessions will be revoked. You will be logged out of this device.'
            : 'This is your only active session. You will be logged out of this device.'
        }}
      </p>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg bg-gray-900/[0.05] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/[0.09] cursor-pointer disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]"
          @click="showLogoutWarning = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 cursor-pointer transition-colors"
          @click="confirmLogoutWarning"
        >
          Revoke
        </button>
      </div>
    </div>
  </div>
</template>

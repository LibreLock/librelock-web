<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
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

async function loadSessions() {
  sessionsLoading.value = true
  sessionsError.value = null
  try {
    const data = await apiRequest<SessionsResponse>('/sessions')
    sessions.value = data?.sessions ?? []
  } catch (err) {
    sessionsError.value = err instanceof ApiError ? err.message : 'Failed to load sessions.'
  } finally {
    sessionsLoading.value = false
  }
}

async function revokeSession(id: string) {
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

async function revokeAllSessions() {
  const auth = useAuthStore()
  if (!confirm('Are you sure you want to revoke all sessions? You will need to log in again.')) {
    return
  }
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

onMounted(() => {
  loadSessions()
})
</script>

<template>
  <div class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
    <div class="px-6 pt-6 pb-1 flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-slate-800">Active sessions</h2>
        <p class="mt-0.5 text-sm text-slate-400">All devices currently logged in to your account</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="sessions.length > 1"
          type="button"
          class="text-xs text-rose-500 hover:text-rose-700 mr-2 transition-colors cursor-pointer disabled:opacity-50"
          :disabled="revokingAll"
          @click="revokeAllSessions"
        >
          {{ revokingAll ? 'Revoking…' : 'Revoke all' }}
        </button>
        <button
          type="button"
          class="text-xs text-slate-500 mr-4 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          :disabled="sessionsLoading"
          @click="loadSessions"
        >
          Refresh
        </button>
      </div>
    </div>

    <hr class="mt-3 border-slate-100" />

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

      <div v-else-if="sessionsError" class="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
        {{ sessionsError }}
      </div>

      <div v-else-if="sessions.length === 0" class="py-8 text-center text-sm text-slate-400">
        No active sessions found.
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="flex items-start gap-4 rounded-lg border border-slate-200 px-4 py-4"
        >
          <div class="w-22 shrink-0">
            <div class="mb-0.5">
              <span
                class="text-sm font-medium text-slate-800"
                title="Session ID: {{ session.id }}"
                >{{ shortDeviceName(session.device_name) }}</span
              >
            </div>
          </div>

          <div class="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 pt-0.5">
            <span v-if="session.ip"><span class="text-slate-500">IP:</span> {{ session.ip }}</span>
            <span
              ><span class="text-slate-500">Created:</span>
              {{ formatDate(session.created_at) }}</span
            >
            <span v-if="session.last_used_at"
              ><span class="text-slate-500">Last active:</span>
              {{ formatDate(session.last_used_at) }}</span
            >
            <span v-if="session.expires_at"
              ><span class="text-slate-500">Expires:</span>
              {{ formatDate(session.expires_at) }}</span
            >
          </div>

          <!-- Actions -->
          <div class="shrink-0 pt-0.5">
            <button
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
</template>

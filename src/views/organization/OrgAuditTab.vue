<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'

interface AuditEvent {
  id: string
  action: string
  actor_name: string
  target_name: string
  detail: string
  created_at: string
}

const events = ref<AuditEvent[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

// Human labels for each action id the backend emits
const actionLabels: Record<string, string> = {
  'user.registered': 'Account created',
  'user.role_changed': 'Role changed',
  'user.ownership_transferred': 'Ownership transferred',
  'user.suspended': 'User suspended',
  'user.reactivated': 'User reactivated',
  'user.removed': 'User removed',
  'invite.created': 'Invite created',
  'invite.revoked': 'Invite revoked',
  'org.updated': 'Branding updated',
  'org.logo_updated': 'Logo updated',
  'org.logo_removed': 'Logo removed',
  'org.registration_changed': 'Registration changed',
  'org.shared_access_granted': 'Shared access granted',
  'org.shared_access_revoked': 'Shared access revoked',
  'org.shared_settings_changed': 'Shared settings changed',
  'app.mode_changed': 'Organization enabled',
}

// Left accent colour by action family
const actionAccent: Record<string, string> = {
  'user.suspended': 'bg-amber-400',
  'user.removed': 'bg-red-400',
  'invite.revoked': 'bg-red-400',
  'user.registered': 'bg-emerald-400',
  'user.reactivated': 'bg-emerald-400',
  'org.shared_access_granted': 'bg-emerald-400',
  'org.shared_access_revoked': 'bg-red-400',
}

function label(action: string) {
  return actionLabels[action] ?? action
}

function accent(action: string) {
  return actionAccent[action] ?? 'bg-gray-300 dark:bg-gray-600'
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const data = await apiRequest<{ events: AuditEvent[] }>('/organization/audit')
    events.value = data?.events ?? []
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load audit log.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

function formatWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
  >
    <div class="px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Audit log</h2>
      <p class="mt-0.5 text-sm text-gray-400">Recent administrative activity on this instance</p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-gray-700" />

    <div class="px-6 py-5">
      <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>

      <div v-if="isLoading" class="py-6 text-center text-sm text-gray-400">Loading…</div>

      <p v-else-if="!events.length" class="py-6 text-center text-sm text-gray-400">
        No activity recorded yet.
      </p>

      <ul v-else class="space-y-3">
        <li v-for="event in events" :key="event.id" class="flex items-start gap-3">
          <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="accent(event.action)" />
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-800 dark:text-gray-200">
              <span class="font-medium">{{ label(event.action) }}</span>
              <span v-if="event.target_name" class="text-gray-500 dark:text-gray-400">
                · {{ event.target_name }}</span
              >
              <span v-if="event.detail" class="text-gray-400"> ({{ event.detail }})</span>
            </p>
            <p class="text-xs text-gray-400">
              {{ event.actor_name || 'system' }} · {{ formatWhen(event.created_at) }}
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

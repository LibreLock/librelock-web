<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import PaginationBar from '@/components/PaginationBar.vue'

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
  'user.owner_added': 'Owner added',
  'user.ownership_transferred': 'Ownership transferred', // pre-multi-owner rows

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
  'user.owner_added': 'bg-amber-400',
  'user.ownership_transferred': 'bg-amber-400',
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

// The log only grows, so pages come from the server rather than loading it all
const PAGE_SIZE = 25
const page = ref(1)
const total = ref(0)

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const offset = (page.value - 1) * PAGE_SIZE
    const data = await apiRequest<{ events: AuditEvent[]; total?: number }>(
      `/organization/audit?limit=${PAGE_SIZE}&offset=${offset}`,
    )
    events.value = data?.events ?? []
    total.value = data?.total ?? events.value.length
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load audit log.'
  } finally {
    isLoading.value = false
  }
}

watch(page, load)

onMounted(load)

function formatWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07]"
  >
    <div class="px-4 sm:px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Audit log</h2>
      <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        Administrative activity on this instance, newest first
      </p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-white/[0.08]" />

    <div class="px-4 sm:px-6 py-5">
      <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>

      <div v-if="isLoading && !events.length" class="py-6 text-center text-sm text-gray-400">
        Loading…
      </div>

      <p v-else-if="!events.length" class="py-6 text-center text-sm text-gray-400">
        No activity recorded yet.
      </p>

      <template v-else>
        <div class="-mx-2 overflow-x-auto" :class="isLoading && 'opacity-60 transition-opacity'">
          <table class="w-full text-left text-sm">
            <thead class="text-xs text-gray-500 dark:text-gray-400">
              <tr>
                <th class="px-2 pb-2 font-medium">Event</th>
                <th class="hidden px-2 pb-2 font-medium sm:table-cell">By</th>
                <th class="px-2 pb-2 text-right font-medium">When</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/[0.06]">
              <tr v-for="event in events" :key="event.id" class="align-top">
                <td class="px-2 py-2.5">
                  <div class="flex items-start gap-2.5">
                    <span
                      class="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      :class="accent(event.action)"
                    />
                    <p class="text-gray-800 dark:text-gray-200">
                      <span class="font-medium">{{ label(event.action) }}</span>
                      <span v-if="event.target_name" class="text-gray-500 dark:text-gray-400">
                        · {{ event.target_name }}</span
                      >
                      <span v-if="event.detail" class="text-gray-400"> ({{ event.detail }})</span>
                      <span class="block text-xs text-gray-500 sm:hidden dark:text-gray-400">
                        {{ event.actor_name || 'system' }}
                      </span>
                    </p>
                  </div>
                </td>
                <td
                  class="hidden whitespace-nowrap px-2 py-2.5 text-gray-600 sm:table-cell dark:text-gray-300"
                >
                  {{ event.actor_name || 'system' }}
                </td>
                <td
                  class="whitespace-nowrap px-2 py-2.5 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400"
                >
                  {{ formatWhen(event.created_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar v-model:page="page" :page-size="PAGE_SIZE" :total="total" class="mt-4" />
      </template>
    </div>
  </div>
</template>

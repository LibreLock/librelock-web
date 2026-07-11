<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'

interface Invite {
  id: string
  note: string
  status: 'pending' | 'used' | 'expired'
  expires_at: string
  used_at: string | null
  created_at: string
  token?: string
}

const invites = ref<Invite[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const note = ref('')
const expiresInDays = ref(1)
const isCreating = ref(false)
const busyId = ref<string | null>(null)
const isPruning = ref(false)
const confirmClearAll = ref(false)

// "Spent" = used or expired invites; these can never be redeemed again
const spentCount = computed(
  () => invites.value.filter((i) => i.status === 'used' || i.status === 'expired').length,
)

// The raw token/link is only returned once, on creation
const lastLink = ref<string | null>(null)
const copied = ref(false)

function inviteLink(token: string) {
  return `${window.location.origin}/register?invite=${encodeURIComponent(token)}`
}

// Backend accepts 1–90 days; keep the sent value in range
function clampDays(n: number) {
  if (!Number.isFinite(n)) return 1
  return Math.min(90, Math.max(1, Math.round(n)))
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const data = await apiRequest<{ invites: Invite[] }>('/organization/invites')
    invites.value = data?.invites ?? []
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load invites.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function create() {
  error.value = null
  copied.value = false
  isCreating.value = true
  try {
    const data = await apiRequest<{ invite: Invite }>('/organization/invites', {
      method: 'POST',
      body: JSON.stringify({
        note: note.value.trim(),
        expires_in_days: clampDays(expiresInDays.value),
      }),
    })
    if (data?.invite?.token) lastLink.value = inviteLink(data.invite.token)
    note.value = ''
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to create invite.'
  } finally {
    isCreating.value = false
  }
}

async function revoke(invite: Invite) {
  error.value = null
  busyId.value = invite.id
  try {
    await apiRequest(`/organization/invites/${invite.id}`, { method: 'DELETE' })
    invites.value = invites.value.filter((i) => i.id !== invite.id)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to revoke invite.'
  } finally {
    busyId.value = null
  }
}

async function prune(scope: 'spent' | 'all') {
  error.value = null
  isPruning.value = true
  try {
    await apiRequest(`/organization/invites?scope=${scope}`, { method: 'DELETE' })
    confirmClearAll.value = false
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to remove invites.'
  } finally {
    isPruning.value = false
  }
}

async function copyLink() {
  if (!lastLink.value) return
  try {
    await navigator.clipboard.writeText(lastLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

const statusClasses: Record<Invite['status'], string> = {
  pending: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  used: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
  >
    <div class="px-4 sm:px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Invites</h2>
      <p class="mt-0.5 text-sm text-gray-400">Generate single-use invite links for new members</p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-gray-700" />

    <div class="px-4 sm:px-6 py-5 space-y-4">
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <form class="flex flex-col sm:flex-row sm:items-end gap-2" @submit.prevent="create">
        <div class="flex-1">
          <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
            >Note (optional)</label
          >
          <input
            v-model="note"
            type="text"
            maxlength="200"
            placeholder="eg. John Doe"
            class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
          />
        </div>
        <div class="w-full sm:w-28">
          <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
            >Expires (days)</label
          >
          <input
            v-model.number="expiresInDays"
            type="number"
            min="1"
            max="90"
            class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
          />
        </div>
        <button
          type="submit"
          class="w-full sm:w-auto rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          :disabled="isCreating"
        >
          {{ isCreating ? 'Creating…' : 'New invite' }}
        </button>
      </form>

      <div
        v-if="lastLink"
        class="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3"
      >
        <p class="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Copy invite link now, it won't be shown again
        </p>
        <div class="flex items-center gap-2">
          <code
            class="flex-1 truncate rounded bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
            >{{ lastLink }}</code
          >
          <button
            type="button"
            class="rounded-md px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer"
            @click="copyLink"
          >
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="py-4 text-center text-sm text-gray-400">Loading…</div>

      <template v-else-if="invites.length">
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            :disabled="isPruning || spentCount === 0"
            :title="spentCount === 0 ? 'No used or expired invites to remove' : undefined"
            @click="prune('spent')"
          >
            Revoke spent{{ spentCount ? ` (${spentCount})` : '' }}
          </button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/60 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            :disabled="isPruning"
            @click="confirmClearAll = true"
          >
            Revoke all
          </button>
        </div>

        <ul class="divide-y divide-gray-100 dark:divide-gray-800">
          <li
            v-for="invite in invites"
            :key="invite.id"
            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ invite.note || 'Invite' }}
              </p>
              <p class="text-xs text-gray-400">
                Created {{ formatDate(invite.created_at) }} · Expires
                {{ formatDate(invite.expires_at) }}
              </p>
            </div>

            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
              :class="statusClasses[invite.status]"
            >
              {{ invite.status }}
            </span>

            <button
              type="button"
              class="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/60 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 cursor-pointer"
              :disabled="busyId === invite.id"
              @click="revoke(invite)"
            >
              Revoke
            </button>
          </li>
        </ul>
      </template>

      <p v-else class="py-4 text-center text-sm text-gray-400">No invites yet</p>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="confirmClearAll"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="confirmClearAll = false"
    >
      <div
        class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
      >
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Remove all invites?</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          This deletes <strong>every</strong> invite, including pending ones that haven't been used
          yet. Any links already shared will stop working.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
            :disabled="isPruning"
            @click="confirmClearAll = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isPruning"
            @click="prune('all')"
          >
            {{ isPruning ? 'Removing…' : 'Remove all' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

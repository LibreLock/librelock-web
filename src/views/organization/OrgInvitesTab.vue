<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { PhCheck, PhCopy } from '@phosphor-icons/vue'

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

function relativeTime(iso: string | null) {
  if (!iso) return ''
  const diff = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(diff)) return ''
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const mins = Math.round(diff / 60000)
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

const statusClasses: Record<Invite['status'], string> = {
  pending: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  used: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07]"
  >
    <div class="px-4 sm:px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Invites</h2>
      <p class="mt-0.5 text-sm text-gray-400">Generate single-use invite links for new members</p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-white/[0.08]" />

    <div class="px-4 sm:px-6 py-5 space-y-4">
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <form class="flex flex-col sm:flex-row sm:items-end gap-2" @submit.prevent="create">
        <div class="flex-1">
          <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
            >Note (optional)</label
          >
          <input
            v-model="note"
            type="text"
            maxlength="200"
            placeholder="eg. John Doe"
            class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
          />
        </div>
        <div class="w-full sm:w-28">
          <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
            >Expires (days)</label
          >
          <input
            v-model.number="expiresInDays"
            type="number"
            min="1"
            max="90"
            class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
          />
        </div>
        <button
          type="submit"
          class="w-full sm:w-auto rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          :disabled="isCreating"
        >
          {{ isCreating ? 'Creating…' : 'New invite' }}
        </button>
      </form>

      <div v-if="lastLink">
        <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
          >Invite link</label
        >
        <div class="relative">
          <input
            :value="lastLink"
            readonly
            class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-11 font-mono text-xs cursor-pointer selection:bg-transparent text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-900/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300 dark:focus:border-white/25 dark:focus:ring-white/[0.06]"
            @click="copyLink"
          />
          <button
            type="button"
            class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors cursor-pointer"
            :class="
              copied
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-gray-600 hover:bg-gray-900/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.08]'
            "
            @click="copyLink"
            :aria-label="copied ? 'Copied' : 'Copy invite link'"
          >
            <PhCheck v-if="copied" :size="16" weight="bold" />
            <PhCopy v-else :size="16" />
          </button>
        </div>
        <p class="mt-1.5 text-xs text-gray-400">This link is shown only once. Copy it now.</p>
      </div>

      <div v-if="isLoading" class="py-4 text-center text-sm text-gray-400">Loading…</div>

      <template v-else-if="invites.length">
        <div class="flex items-center justify-between pt-1">
          <h3 class="text-[13px] font-medium text-gray-500 dark:text-gray-400">
            {{ invites.length }} {{ invites.length === 1 ? 'invite' : 'invites' }}
          </h3>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer text-gray-500 hover:bg-gray-900/[0.05] hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-100"
              :disabled="isPruning || spentCount === 0"
              :title="spentCount === 0 ? 'No used or expired invites to remove' : undefined"
              @click="prune('spent')"
            >
              Revoke spent{{ spentCount ? ` (${spentCount})` : '' }}
            </button>
            <button
              type="button"
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer text-red-600 hover:bg-red-500/10 dark:text-red-400"
              :disabled="isPruning"
              @click="confirmClearAll = true"
            >
              Revoke all
            </button>
          </div>
        </div>

        <ul class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          <li
            v-for="invite in invites"
            :key="invite.id"
            class="flex items-center gap-3 py-4 first:pt-2 last:pb-0"
          >
            <div class="min-w-0 flex-1" :class="{ 'opacity-60': invite.status !== 'pending' }">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ invite.note || 'Invite' }}
              </p>
              <p class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-gray-400">
                <span :title="formatDate(invite.created_at)"
                  >Created {{ relativeTime(invite.created_at) }}</span
                >
                <span v-if="invite.status === 'used' && invite.used_at"
                  >Used {{ relativeTime(invite.used_at) }}</span
                >
                <span v-else :title="formatDate(invite.expires_at)"
                  >{{ invite.status === 'expired' ? 'Expired' : 'Expires' }}
                  {{ relativeTime(invite.expires_at) }}</span
                >
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
              class="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shrink-0 text-red-600 hover:bg-red-500/10 dark:text-red-400"
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
      class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
      @click.self="confirmClearAll = false"
    >
      <div
        class="max-w-md w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
      >
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Remove all invites?</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          This deletes every invite, including pending ones that haven't been used yet. Any links
          already shared will stop working.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-gray-900/[0.05] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/[0.09] cursor-pointer disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]"
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

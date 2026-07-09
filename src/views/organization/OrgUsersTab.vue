<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

interface OrgUser {
  id: string
  username: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'suspended'
  created_at: string
}

// Colour per role; owner (founder) gets its own distinct badge.
function roleBadgeClass(role: OrgUser['role']) {
  if (role === 'owner')
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
  if (role === 'admin')
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
}

const auth = useAuthStore()

const users = ref<OrgUser[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

// Which row's actions (⋮) menu is open; only one at a time.
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}

const currentId = computed(() => String(auth.user?.id ?? ''))
// Active admins (owner included) keep an instance manageable; guards key off this.
const activeAdminCount = computed(
  () =>
    users.value.filter((u) => (u.role === 'admin' || u.role === 'owner') && u.status === 'active')
      .length,
)

// True when acting on this admin would leave no usable admin behind.
function isLastAdmin(user: OrgUser) {
  return user.role === 'admin' && user.status === 'active' && activeAdminCount.value <= 1
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const data = await apiRequest<{ users: OrgUser[] }>('/organization/users')
    users.value = data?.users ?? []
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load users.'
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function setRole(user: OrgUser, role: 'admin' | 'member') {
  error.value = null
  busyId.value = user.id
  try {
    const data = await apiRequest<{ user: OrgUser }>(`/organization/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    })
    if (data?.user) Object.assign(user, data.user)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update role.'
  } finally {
    busyId.value = null
  }
}

// Choosing "owner" opens the transfer modal; other roles apply immediately.
function onRoleSelect(user: OrgUser, event: Event) {
  const role = (event.target as HTMLSelectElement).value as OrgUser['role']
  if (role === user.role) return
  if (role === 'owner') {
    transferTarget.value = user
    return
  }
  setRole(user, role)
}

const transferTarget = ref<OrgUser | null>(null)
const isTransferring = ref(false)

async function confirmTransfer() {
  const user = transferTarget.value
  if (!user) return
  error.value = null
  isTransferring.value = true
  busyId.value = user.id
  try {
    const data = await apiRequest<{ user: OrgUser }>(`/organization/users/${user.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: 'owner' }),
    })
    if (data?.user) Object.assign(user, data.user)
    transferTarget.value = null
    await auth.refreshSession() // the current user is no longer the owner
    await load()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to transfer ownership.'
  } finally {
    isTransferring.value = false
    busyId.value = null
  }
}

async function setStatus(user: OrgUser, status: 'active' | 'suspended') {
  closeMenu()
  error.value = null
  busyId.value = user.id
  try {
    const data = await apiRequest<{ user: OrgUser }>(`/organization/users/${user.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    if (data?.user) Object.assign(user, data.user)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update status.'
  } finally {
    busyId.value = null
  }
}

async function removeUser(user: OrgUser) {
  closeMenu()
  error.value = null
  busyId.value = user.id
  try {
    await apiRequest(`/organization/users/${user.id}`, { method: 'DELETE' })
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to remove user.'
  } finally {
    busyId.value = null
  }
}

// Confirmation modals for the destructive/impactful menu actions.
const suspendTarget = ref<OrgUser | null>(null)
const removeTarget = ref<OrgUser | null>(null)
const isActioning = ref(false)

function askSuspend(user: OrgUser) {
  closeMenu()
  suspendTarget.value = user
}
function askRemove(user: OrgUser) {
  closeMenu()
  removeTarget.value = user
}

async function confirmSuspend() {
  const user = suspendTarget.value
  if (!user) return
  isActioning.value = true
  await setStatus(user, 'suspended')
  isActioning.value = false
  suspendTarget.value = null
}
async function confirmRemove() {
  const user = removeTarget.value
  if (!user) return
  isActioning.value = true
  await removeUser(user)
  isActioning.value = false
  removeTarget.value = null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Users</h2>
        <p class="mt-0.5 text-sm text-gray-400">Manage users, roles, and access</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-6 py-5">
        <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>

        <div v-if="isLoading" class="py-6 text-center text-sm text-gray-400">Loading…</div>

        <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <li
            v-for="user in users"
            :key="user.id"
            class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            :class="{ 'opacity-60': user.status === 'suspended' }"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ user.username }}
                  <span v-if="user.id === currentId" class="text-xs font-normal text-gray-400"
                    >(You)</span
                  >
                </p>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
                  :class="roleBadgeClass(user.role)"
                >
                  {{ user.role }}
                </span>
              </div>
              <p class="text-xs text-gray-400">Joined {{ formatDate(user.created_at) }}</p>
            </div>

            <span
              v-if="user.status === 'suspended'"
              class="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
            >
              Suspended
            </span>

            <div
              v-if="user.id !== currentId && user.role !== 'owner'"
              class="flex items-center gap-2"
            >
              <div class="relative">
                <select
                  :value="user.role"
                  :disabled="busyId === user.id"
                  class="h-7 appearance-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-2.5 pr-7 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 disabled:opacity-50 cursor-pointer"
                  @change="onRoleSelect(user, $event)"
                >
                  <option value="member" :disabled="user.role === 'admin' && isLastAdmin(user)">
                    Member
                  </option>
                  <option value="admin">Admin</option>
                  <option v-if="auth.isOwner" value="owner">Owner…</option>
                </select>
                <svg
                  class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>

              <div class="relative">
                <button
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 ring-1 ring-gray-300 dark:ring-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 cursor-pointer"
                  :disabled="busyId === user.id"
                  :aria-expanded="openMenuId === user.id"
                  aria-haspopup="menu"
                  title="More actions"
                  @click="toggleMenu(user.id)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                    />
                  </svg>
                </button>

                <template v-if="openMenuId === user.id">
                  <!-- click-away backdrop -->
                  <div class="fixed inset-0 z-40" @click="closeMenu" />
                  <div
                    role="menu"
                    class="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg bg-white dark:bg-gray-900 py-1 shadow-lg ring-1 ring-gray-200 dark:ring-gray-700"
                  >
                    <button
                      v-if="user.status === 'active'"
                      type="button"
                      class="block w-full px-3 py-1.5 text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      :disabled="isLastAdmin(user)"
                      :title="isLastAdmin(user) ? 'The last admin cannot be suspended' : undefined"
                      @click="askSuspend(user)"
                    >
                      Suspend
                    </button>
                    <button
                      v-else
                      type="button"
                      class="block w-full px-3 py-1.5 text-left text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                      @click="setStatus(user, 'active')"
                    >
                      Reactivate
                    </button>
                    <button
                      type="button"
                      class="block w-full px-3 py-1.5 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      :disabled="isLastAdmin(user)"
                      :title="isLastAdmin(user) ? 'The last admin cannot be removed' : undefined"
                      @click="askRemove(user)"
                    >
                      Remove
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="transferTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="transferTarget = null"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-amber-700 dark:text-amber-400">
            Transfer ownership?
          </h3>
          <div class="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <strong>{{ transferTarget.username }}</strong> will become the new
              <strong>owner</strong> of this organization.
            </p>
            <p>
              You will be demoted to <strong>admin</strong> and lose owner-only powers, including
              the ability to revert the instance to personal mode. Only the new owner can transfer
              ownership back.
            </p>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isTransferring"
              @click="transferTarget = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isTransferring"
              @click="confirmTransfer"
            >
              {{ isTransferring ? 'Transferring…' : 'Transfer ownership' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="suspendTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="suspendTarget = null"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-amber-700 dark:text-amber-400">Suspend user?</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            <strong>{{ suspendTarget.username }}</strong> will be signed out everywhere and cannot
            log in until reactivated. Their vault is <strong>kept</strong>.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isActioning"
              @click="suspendTarget = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isActioning"
              @click="confirmSuspend"
            >
              {{ isActioning ? 'Suspending…' : 'Suspend' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="removeTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="removeTarget = null"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Remove user?</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This <strong>permanently deletes</strong>
            <strong>{{ removeTarget.username }}</strong> and their entire vault — passwords,
            categories, and sessions. Under end-to-end encryption it
            <strong>cannot be recovered</strong>.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isActioning"
              @click="removeTarget = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isActioning"
              @click="confirmRemove"
            >
              {{ isActioning ? 'Removing…' : 'Remove user' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

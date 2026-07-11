<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { getOrgKey } from '@/services/keyring'
import { listMembers, grantAccess, revokeAccess, bootstrapOrgKey } from '@/api/orgMembership'

interface OrgUser {
  id: string
  username: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'suspended'
  created_at: string
}

// Per-user shared-vault access, keyed by user id (from /organization/memberships)
interface AccessInfo {
  has_access: boolean
  public_key: string
}

// Colour per role; owner (founder) gets its own distinct badge
function roleBadgeClass(role: OrgUser['role']) {
  if (role === 'owner')
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
  if (role === 'admin')
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
}

const auth = useAuthStore()
const orgStore = useOrganizationStore()

const users = ref<OrgUser[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)

// --- Shared vault access ---
const accessMap = ref<Record<string, AccessInfo>>({})
const orgKeyReady = ref(false)
const isBootstrapping = ref(false)
const isGrantingAll = ref(false)
const revokeTarget = ref<OrgUser | null>(null)
const isRevoking = ref(false)

function hasAccess(user: OrgUser) {
  return accessMap.value[user.id]?.has_access ?? false
}
function hasKeypair(user: OrgUser) {
  return Boolean(accessMap.value[user.id]?.public_key)
}
// This admin can hand out access only if they hold the org key themselves
const canManageAccess = computed(() => orgKeyReady.value)
const sharedInitialized = computed(() => Object.values(accessMap.value).some((a) => a.has_access))
// Non-owner users still lacking access (owner always has it once bootstrapped)
const withoutAccess = computed(() => users.value.filter((u) => u.role !== 'owner' && !hasAccess(u)))
const grantable = computed(() =>
  withoutAccess.value.filter((u) => hasKeypair(u) && u.status === 'active'),
)
const pendingKeyCount = computed(() => withoutAccess.value.filter((u) => !hasKeypair(u)).length)

// Which row's actions (⋮) menu is open; only one at a time
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}

const currentId = computed(() => String(auth.user?.id ?? ''))
// Active admins (owner included) keep an instance manageable; guards key off this
const activeAdminCount = computed(
  () =>
    users.value.filter((u) => (u.role === 'admin' || u.role === 'owner') && u.status === 'active')
      .length,
)

// True when acting on this admin would leave no usable admin behind
function isLastAdmin(user: OrgUser) {
  return user.role === 'admin' && user.status === 'active' && activeAdminCount.value <= 1
}

async function load() {
  isLoading.value = true
  error.value = null
  try {
    const data = await apiRequest<{ users: OrgUser[] }>('/organization/users')
    users.value = data?.users ?? []
    await loadAccess()
    await maybeAutoGrant()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load users.'
  } finally {
    isLoading.value = false
  }
}

// Refreshes only the shared-access map (avoids reloading the whole user list)
async function loadAccess() {
  const members = await listMembers()
  const map: Record<string, AccessInfo> = {}
  for (const m of members) map[m.user_id] = { has_access: m.has_access, public_key: m.public_key }
  accessMap.value = map
  orgKeyReady.value = getOrgKey() !== null
}

// Auto-grant policy: when enabled and this admin holds the key, grant every grantable member without access
// Idempotent: once everyone's granted, a reload is a no-op, so only genuinely new members get picked up
async function maybeAutoGrant() {
  if (!orgStore.autoGrantShared || !canManageAccess.value) return
  const targets = grantable.value
  if (targets.length === 0) return
  for (const user of targets) {
    try {
      await grantAccess(user.id, accessMap.value[user.id]?.public_key ?? '')
    } catch {
      // Best-effort; a single failure shouldn't block the rest
    }
  }
  await loadAccess()
}

onMounted(load)

async function enableSharedVault() {
  error.value = null
  const id = auth.user?.id
  const pub = auth.user?.public_key
  if (!id || !pub) {
    error.value = 'Your account is missing a sharing key. Log out and back in, then retry.'
    return
  }
  isBootstrapping.value = true
  try {
    await bootstrapOrgKey(String(id), pub)
    orgKeyReady.value = true
    await loadAccess()
    await maybeAutoGrant()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to enable the shared vault.'
  } finally {
    isBootstrapping.value = false
  }
}

async function grant(user: OrgUser) {
  error.value = null
  busyId.value = user.id
  try {
    await grantAccess(user.id, accessMap.value[user.id]?.public_key ?? '')
    await loadAccess()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to grant access.'
  } finally {
    busyId.value = null
  }
}

async function grantAll() {
  error.value = null
  isGrantingAll.value = true
  try {
    for (const user of grantable.value) {
      await grantAccess(user.id, accessMap.value[user.id]?.public_key ?? '')
    }
    await loadAccess()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to grant access to everyone.'
  } finally {
    isGrantingAll.value = false
  }
}

async function confirmRevokeAccess() {
  const user = revokeTarget.value
  if (!user) return
  error.value = null
  isRevoking.value = true
  busyId.value = user.id
  try {
    await revokeAccess(user.id)
    revokeTarget.value = null
    await loadAccess()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to revoke access.'
  } finally {
    isRevoking.value = false
    busyId.value = null
  }
}

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

// Choosing "owner" opens the transfer modal; other roles apply immediately
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

// Confirmation modals for the destructive/impactful menu actions
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
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Users</h2>
        <p class="mt-0.5 text-sm text-gray-400">Manage users, roles, and access</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5">
        <p v-if="error" class="mb-3 text-sm text-red-600">{{ error }}</p>

        <div v-if="isLoading" class="py-6 text-center text-sm text-gray-400">Loading…</div>

        <template v-else>
          <!-- Shared vault status / bulk actions. -->
          <div
            v-if="!sharedInitialized && !orgKeyReady"
            class="mb-4 flex flex-col gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Shared vault isn't set up. Enable it to share entries across the organization.
            </p>
            <button
              v-if="auth.isOwner"
              type="button"
              class="w-full shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50 cursor-pointer sm:w-auto"
              :disabled="isBootstrapping"
              @click="enableSharedVault"
            >
              {{ isBootstrapping ? 'Enabling…' : 'Enable shared vault' }}
            </button>
          </div>

          <div
            v-else-if="!canManageAccess"
            class="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
          >
            You don't have shared-vault access yet, so you can't grant it to others. Ask an owner or
            a member with access, then reload.
          </div>

          <div
            v-else-if="withoutAccess.length > 0"
            class="mb-4 flex flex-col gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ withoutAccess.length }} member{{ withoutAccess.length === 1 ? '' : 's' }} without
              shared access<span v-if="pendingKeyCount > 0" class="text-gray-400">
                · {{ pendingKeyCount }} awaiting first sign-in</span
              >
            </p>
            <button
              type="button"
              class="w-full shrink-0 rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer sm:w-auto"
              :disabled="isGrantingAll || grantable.length === 0"
              :title="
                grantable.length === 0 ? 'No members are ready to receive access yet' : undefined
              "
              @click="grantAll"
            >
              {{ isGrantingAll ? 'Granting…' : `Grant all (${grantable.length})` }}
            </button>
          </div>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="user in users"
              :key="user.id"
              class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
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

              <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
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
                  <!-- Shared vault grant / revoke. -->
                  <button
                    v-if="canManageAccess && hasAccess(user)"
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/60 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 cursor-pointer"
                    :disabled="busyId === user.id"
                    @click="revokeTarget = user"
                  >
                    Revoke share
                  </button>
                  <button
                    v-else-if="canManageAccess"
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-semibold text-gray-700 dark:text-gray-200 ring-1 ring-gray-300 dark:ring-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    :disabled="busyId === user.id || !hasKeypair(user) || user.status !== 'active'"
                    :title="
                      !hasKeypair(user)
                        ? 'Member must sign in once before access can be granted'
                        : undefined
                    "
                    @click="grant(user)"
                  >
                    Grant share
                  </button>

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
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
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
                          :title="
                            isLastAdmin(user) ? 'The last admin cannot be suspended' : undefined
                          "
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
                          :title="
                            isLastAdmin(user) ? 'The last admin cannot be removed' : undefined
                          "
                          @click="askRemove(user)"
                        >
                          Remove
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="revokeTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="revokeTarget = null"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
            Revoke shared access?
          </h3>
          <div class="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <strong>{{ revokeTarget.username }}</strong> will no longer open shared entries after
              their next sign-in.
            </p>
            <p class="text-amber-700 dark:text-amber-300">
              They already held the shared key while a member, so anything they saw or exported
              stays readable to them. Full secrecy requires rotating the shared key (a future
              feature).
            </p>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isRevoking"
              @click="revokeTarget = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isRevoking"
              @click="confirmRevokeAccess"
            >
              {{ isRevoking ? 'Revoking…' : 'Revoke access' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

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
            User {{ suspendTarget.username }} will be signed out everywhere and cannot log in until
            reactivated.
            <br />
            Their vault is kept.
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
            This <strong>permanently deletes</strong> user {{ removeTarget.username }} and their
            entire vault: passwords, categories, and sessions.
            <br />
            Their data cannot be recovered.
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

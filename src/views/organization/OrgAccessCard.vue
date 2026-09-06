<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError } from '@/services/api'
import { useOrganizationStore } from '@/stores/organization'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const org = useOrganizationStore()

const error = ref<string | null>(null)

// --- Registration (switch on = public sign-up) ---
const isPublic = computed(() => org.registration === 'open')
const regBusy = ref(false)
const showDangerModal = ref(false)

async function applyRegistration(open: boolean) {
  error.value = null
  regBusy.value = true
  try {
    await org.setRegistration(open ? 'open' : 'invite')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update registration.'
  } finally {
    regBusy.value = false
  }
}

// Enabling public sign-up is dangerous, so confirm first; disabling is instant
function onRegistrationChange(next: boolean) {
  if (regBusy.value) return
  if (next) {
    showDangerModal.value = true
  } else {
    applyRegistration(false)
  }
}

async function confirmPublic() {
  showDangerModal.value = false
  await applyRegistration(true)
}

// --- Auto-grant shared vault access ---
const autoGrant = computed(() => org.autoGrantShared)
const shareBusy = ref(false)

async function toggleAutoGrant() {
  if (shareBusy.value) return
  error.value = null
  shareBusy.value = true
  try {
    await org.setAutoGrantShared(!autoGrant.value)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update setting.'
  } finally {
    shareBusy.value = false
  }
}

// --- What plain members may do to shared entries (admins and owners may always do both) ---
const memberManageShared = computed(() => org.memberManageShared)
const manageBusy = ref(false)

async function toggleMemberManageShared() {
  if (manageBusy.value) return
  error.value = null
  manageBusy.value = true
  try {
    await org.setMemberManageShared(!memberManageShared.value)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update setting.'
  } finally {
    manageBusy.value = false
  }
}

const memberEditShared = computed(() => org.memberEditShared)
const editBusy = ref(false)

async function toggleMemberEditShared() {
  if (editBusy.value) return
  error.value = null
  editBusy.value = true
  try {
    await org.setMemberEditShared(!memberEditShared.value)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update setting.'
  } finally {
    editBusy.value = false
  }
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
  >
    <div class="px-4 sm:px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Access</h2>
      <p class="mt-0.5 text-sm text-gray-400">Manage instance access and member permissions</p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-gray-700" />

    <p v-if="error" class="px-4 sm:px-6 pt-4 text-sm text-red-600">{{ error }}</p>

    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <!-- Public sign-up -->
      <div class="flex items-start justify-between gap-4 px-4 sm:px-6 py-5">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Public sign-up</p>
          </div>
          <p class="mt-1 text-xs text-gray-400">
            Off means the instance is invite-only (recommended, default). New users will need a
            single-use link generated in the Invites tab. When this setting is on, anyone who can
            reach this instance can create an account.
          </p>
        </div>

        <ToggleSwitch
          class="mt-0.5"
          :model-value="isPublic"
          :disabled="regBusy"
          @change="onRegistrationChange"
        />
      </div>

      <!-- Auto-grant shared vault access -->
      <div class="flex items-start justify-between gap-4 px-4 sm:px-6 py-5">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Auto-grant shared vault
          </p>
          <p class="mt-1 text-xs text-gray-400">
            New members receive shared-vault access automatically. Because the vault is end-to-end
            encrypted, access is applied the next time an admin who holds the shared key opens the
            Users tab, not instantly at sign-up.
          </p>
        </div>

        <ToggleSwitch
          class="mt-0.5"
          :model-value="autoGrant"
          :disabled="shareBusy"
          @change="toggleAutoGrant"
        />
      </div>

      <div class="flex items-start justify-between gap-4 px-4 sm:px-6 py-5">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Allow members to manage shared entries
          </p>
          <p class="mt-1 text-xs text-gray-400">
            Adding an entry to the shared vault, deleting from it, and moving entries back into a
            private vault. Off (default) allows all three only to admins and owners.
          </p>
        </div>

        <ToggleSwitch
          class="mt-0.5"
          :model-value="memberManageShared"
          :disabled="manageBusy"
          @change="toggleMemberManageShared"
        />
      </div>

      <div class="flex items-start justify-between gap-4 px-4 sm:px-6 py-5">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Allow members to edit shared entries
          </p>
          <p class="mt-1 text-xs text-gray-400">
            Changing the contents of shared entries (name, password, notes...). Off (default) means
            members can read and copy shared entries but not alter them. Managing shared categories
            needs this and the permission above together. Both are enforced on the server, not only
            in the interface.
          </p>
        </div>

        <ToggleSwitch
          class="mt-0.5"
          :model-value="memberEditShared"
          :disabled="editBusy"
          @change="toggleMemberEditShared"
        />
      </div>
    </div>

    <!-- Danger confirmation for enabling public sign-up -->
    <Teleport to="body">
      <div
        v-if="showDangerModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showDangerModal = false"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
            Enable public registration?
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Anyone who can reach this instance will be able to create an account without an invite.
            On a publicly reachable server this can let strangers join your organization. Only
            enable this if the instance is on a trusted, restricted network or you intend open
            enrollment.
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            You can switch back to invite-only at any time.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              @click="showDangerModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
              @click="confirmPublic"
            >
              Enable public registration
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

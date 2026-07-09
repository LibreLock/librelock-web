<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError } from '@/services/api'
import { useOrganizationStore } from '@/stores/organization'
import type { RegistrationPolicy } from '@/stores/organization'

const org = useOrganizationStore()

const current = computed<RegistrationPolicy>(() => org.registration)
const busy = ref(false)
const error = ref<string | null>(null)
const showDangerModal = ref(false)

async function apply(policy: RegistrationPolicy) {
  if (policy === current.value) return
  error.value = null
  busy.value = true
  try {
    await org.setRegistration(policy)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to update registration.'
  } finally {
    busy.value = false
  }
}

// Invite-only is always safe; opening public sign-up asks for confirmation.
function choose(policy: RegistrationPolicy) {
  if (policy === current.value || busy.value) return
  if (policy === 'open') {
    showDangerModal.value = true
    return
  }
  apply('invite')
}

async function confirmPublic() {
  showDangerModal.value = false
  await apply('open')
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
  >
    <div class="px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Registration</h2>
      <p class="mt-0.5 text-sm text-gray-400">Control who can create an account</p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-gray-700" />

    <div class="px-6 py-5 space-y-3">
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <!-- Invite-only -->
      <button
        type="button"
        class="w-full text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer disabled:cursor-not-allowed"
        :class="
          current === 'invite'
            ? 'border-gray-800 dark:border-gray-100 ring-1 ring-gray-800 dark:ring-gray-100'
            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        "
        :disabled="busy"
        @click="choose('invite')"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Invite-only</span>
          <span v-if="current === 'invite'" class="text-xs font-semibold text-gray-500"
            >Active</span
          >
        </div>
        <p class="mt-1 text-xs text-gray-400">
          <span class="font-medium text-gray-600 dark:text-gray-300">Recommended.</span>
          New users need a single-use invite link from an admin.
        </p>
      </button>

      <!-- Public -->
      <button
        type="button"
        class="w-full text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer disabled:cursor-not-allowed"
        :class="
          current === 'open'
            ? 'border-gray-800 dark:border-gray-100 ring-1 ring-gray-800 dark:ring-gray-100'
            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        "
        :disabled="busy"
        @click="choose('open')"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">Public sign-up</span>
          <span v-if="current === 'open'" class="text-xs font-semibold text-gray-500">Active</span>
        </div>
        <p class="mt-1 text-xs text-gray-400">
          <span class="font-medium text-gray-600 dark:text-gray-300">Dangerous.</span>
          Anyone who can reach this instance can create an account.
        </p>
      </button>
    </div>

    <!-- Danger confirmation modal -->
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
            <strong>Anyone</strong> who can reach this instance will be able to create an account
            without an invite. On a publicly reachable server this can let strangers join your
            organization. Only enable this if the instance is on a trusted, restricted network or
            you intend open enrollment.
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

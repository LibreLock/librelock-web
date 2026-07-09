<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError } from '@/services/api'
import { useAuthStore, fetchKdfParams } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { deriveKeys, unwrapKey } from '@/services/crypto'
import router from '@/router'

const auth = useAuthStore()
const org = useOrganizationStore()

// Guarded by password re-auth AND typing "delete <org name>".
const confirmPhrase = computed(() => `delete ${org.name}`)
const showRevertModal = ref(false)
const isReverting = ref(false)
const revertError = ref<string | null>(null)
const revertPassword = ref('')
const revertConfirmText = ref('')
const showRevertPassword = ref(false)

const canRevert = computed(
  () =>
    !isReverting.value &&
    revertPassword.value.length > 0 &&
    revertConfirmText.value.trim().toLowerCase() === confirmPhrase.value.toLowerCase(),
)

function openRevertModal() {
  revertError.value = null
  revertPassword.value = ''
  revertConfirmText.value = ''
  showRevertModal.value = true
}

async function confirmRevertToPersonal() {
  if (!canRevert.value) return
  revertError.value = null
  isReverting.value = true
  try {
    const username = auth.user?.username
    const currentProtectedKey = auth.user?.protected_key
    if (!username || !currentProtectedKey) throw new Error('Not logged in.')

    // Derive + validate the password locally, then send the auth credential.
    const kdfParams = await fetchKdfParams(username)
    const { wrappingKey, authCredential } = await deriveKeys(revertPassword.value, kdfParams)
    await unwrapKey(currentProtectedKey, wrappingKey) // throws on wrong password

    await org.revertToPersonal(authCredential)
    await auth.refreshSession()
    showRevertModal.value = false
    router.push('/')
  } catch (err) {
    revertError.value =
      err instanceof ApiError ? err.message : 'Invalid password. Please try again.'
  } finally {
    isReverting.value = false
  }
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-red-200 dark:ring-red-900/60"
  >
    <div class="px-6 pt-6 pb-1">
      <h2 class="text-base font-semibold text-red-700 dark:text-red-400">
        Return to personal mode
      </h2>
      <p class="mt-0.5 text-sm text-gray-400">
        Tear down the organization and run as a single-user vault
      </p>
    </div>

    <hr class="mt-3 border-gray-100 dark:border-gray-700" />

    <div class="px-6 py-5 space-y-4">
      <div
        class="rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300 space-y-2"
      >
        <p>
          <strong>This permanently deletes every other user</strong> and all of their vault data —
          passwords, categories, and sessions. Under end-to-end encryption it cannot be recovered.
        </p>
        <p>
          Only <span class="font-medium">your</span> account survives. Roles, invites, branding, and
          the audit log are removed.
        </p>
        <p><strong>This action cannot be undone.</strong></p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
        @click="openRevertModal"
      >
        Return to personal mode…
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showRevertModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showRevertModal = false"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
            Return to personal mode?
          </h3>
          <div class="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>
              This will <strong>permanently delete every other user</strong> and all of their vault
              data. Only <strong>your</strong> account ({{ auth.user?.username }}) will remain.
            </p>
            <p>
              The organization, its invites, branding, and audit log are dropped. This
              <strong>cannot be undone</strong>.
            </p>
          </div>

          <div class="mt-4 space-y-3">
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Confirm your password
              </label>
              <div class="relative">
                <input
                  v-model="revertPassword"
                  :type="showRevertPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  class="w-full rounded-md border px-3 py-1.5 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900 transition"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  @click="showRevertPassword = !showRevertPassword"
                >
                  {{ showRevertPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Type
                <span class="font-mono text-red-600 dark:text-red-400">{{ confirmPhrase }}</span>
                to confirm
              </label>
              <input
                v-model="revertConfirmText"
                type="text"
                autocomplete="off"
                :placeholder="confirmPhrase"
                class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900 transition"
              />
            </div>
          </div>

          <p v-if="revertError" class="mt-3 text-sm text-red-600">{{ revertError }}</p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isReverting"
              @click="showRevertModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canRevert"
              @click="confirmRevertToPersonal"
            >
              {{ isReverting ? 'Deleting…' : 'Delete users & revert' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

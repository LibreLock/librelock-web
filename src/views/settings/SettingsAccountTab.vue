<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore, fetchKdfParams } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import {
  deriveKeys,
  generateKdfSalt,
  wrapKey,
  unwrapKey,
  unwrapPrivateKey,
  wrapPrivateKey,
  type KdfParams,
} from '@/services/crypto'
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '@/constants'
import router from '@/router'

const auth = useAuthStore()
const org = useOrganizationStore()

// Switch to organization mode (personal instances only)
const showSwitchModal = ref(false)
const isSwitching = ref(false)
const switchError = ref<string | null>(null)

async function confirmSwitchToOrganization() {
  switchError.value = null
  isSwitching.value = true
  try {
    await org.switchToOrganization()
    await auth.refreshSession() // pick up the new owner role
    showSwitchModal.value = false
    router.push('/organization')
  } catch (err) {
    switchError.value =
      err instanceof ApiError ? err.message : 'Failed to switch to organization mode.'
  } finally {
    isSwitching.value = false
  }
}

// Username
const editUsername = ref(auth.user?.username ?? '')
const usernameError = ref<string | null>(null)
const usernameSuccess = ref(false)
const isSavingUsername = ref(false)

async function handleSaveUsername() {
  usernameError.value = null
  usernameSuccess.value = false
  isSavingUsername.value = true
  try {
    await apiRequest('/settings/username', {
      method: 'PUT',
      body: JSON.stringify({ username: editUsername.value.trim() }),
    })
    await auth.refreshSession()
    usernameSuccess.value = true
  } catch (err) {
    usernameError.value = err instanceof ApiError ? err.message : 'Failed to update username.'
  } finally {
    isSavingUsername.value = false
  }
}

// Password
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSuccess = ref(false)
const isChangingPassword = ref(false)
const newPasswordFocused = ref(false)

const showCurrentPassword = ref(false)
const showNewPasswords = ref(false)

const hasUpper = computed(() => /[A-Z]/.test(newPassword.value))
const hasLower = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /[0-9]/.test(newPassword.value))
const hasSymbol = computed(() => /[^A-Za-z0-9]/.test(newPassword.value))
const passwordMinOk = computed(() => newPassword.value.length >= MIN_PASSWORD_LENGTH)
const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && newPassword.value !== confirmPassword.value,
)
const canSubmit = computed(
  () =>
    !isChangingPassword.value &&
    currentPassword.value.length > 0 &&
    hasUpper.value &&
    hasLower.value &&
    hasNumber.value &&
    hasSymbol.value &&
    passwordMinOk.value &&
    !passwordMismatch.value,
)

async function handleChangePassword() {
  passwordError.value = null
  isChangingPassword.value = true
  try {
    const username = auth.user?.username
    const currentProtectedKey = auth.user?.protected_key
    if (!username || !currentProtectedKey) throw new Error('Not logged in.')

    const currentKdfParams = await fetchKdfParams(username)
    const { wrappingKey: currentWrappingKey, authCredential: currentAuthCredential } =
      await deriveKeys(currentPassword.value, currentKdfParams)

    const vaultKey = await unwrapKey(currentProtectedKey, currentWrappingKey)

    const newKdfSalt = generateKdfSalt()
    const newKdfParams: KdfParams = {
      kdfSalt: newKdfSalt,
      kdfIter: currentKdfParams.kdfIter,
      kdfMemory: currentKdfParams.kdfMemory,
      kdfParallelism: currentKdfParams.kdfParallelism,
    }
    const { wrappingKey: newWrappingKey, authCredential: newAuthCredential } = await deriveKeys(
      newPassword.value,
      newKdfParams,
    )

    const newProtectedKey = await wrapKey(vaultKey, newWrappingKey)

    // Re-wrap the sharing private key under the new password key
    // The public key and all org-key envelopes stay valid, so nothing else needs re-keying
    let newEncryptedPrivateKey: string | undefined
    if (auth.user?.encrypted_private_key) {
      const privateKey = await unwrapPrivateKey(auth.user.encrypted_private_key, currentWrappingKey)
      newEncryptedPrivateKey = await wrapPrivateKey(privateKey, newWrappingKey)
    }

    await apiRequest('/settings/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_auth_credential: currentAuthCredential,
        new_auth_credential: newAuthCredential,
        new_protected_key: newProtectedKey,
        new_kdf_salt: newKdfSalt,
        new_kdf_iter: newKdfParams.kdfIter,
        new_kdf_memory: newKdfParams.kdfMemory,
        new_kdf_parallelism: newKdfParams.kdfParallelism,
        new_encrypted_private_key: newEncryptedPrivateKey,
      }),
    })

    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    console.error(err)
    passwordError.value =
      err instanceof ApiError
        ? err.message
        : 'Password change failed. Make sure your current password is correct.'
  } finally {
    isChangingPassword.value = false
  }
}

// Account deletion
const deletePassword = ref('')
const deletePasswordError = ref<string | null>(null)
const isDeletingAccount = ref(false)
const showDeletePassword = ref(false)
const showDeleteModal = ref(false)
const deleteAuthCredential = ref<string | null>(null)

// Step 1: validate the password locally, then open the confirm modal
async function handleDeleteAccount() {
  deletePasswordError.value = null
  isDeletingAccount.value = true
  try {
    const username = auth.user?.username
    const currentProtectedKey = auth.user?.protected_key
    if (!username || !currentProtectedKey) throw new Error('Not logged in.')

    // Validate password by attempting to derive keys
    const currentKdfParams = await fetchKdfParams(username)
    const { wrappingKey: currentWrappingKey, authCredential: currentAuthCredential } =
      await deriveKeys(deletePassword.value, currentKdfParams)
    await unwrapKey(currentProtectedKey, currentWrappingKey)
    deleteAuthCredential.value = currentAuthCredential

    showDeleteModal.value = true
  } catch (err) {
    deletePasswordError.value = err instanceof ApiError ? err.message : 'Invalid password.'
  } finally {
    isDeletingAccount.value = false
  }
}

// Step 2: the modal's confirm button actually deletes
async function confirmDeleteAccount() {
  deletePasswordError.value = null
  isDeletingAccount.value = true
  try {
    await apiRequest('/settings/account', {
      method: 'DELETE',
      body: JSON.stringify({ auth_credential: deleteAuthCredential.value }),
    })

    await auth.logOut()
    router.push('/login')
  } catch (err) {
    console.error(err)
    showDeleteModal.value = false
    deletePasswordError.value =
      err instanceof ApiError ? err.message : 'Error occurred while deleting account.'
  } finally {
    isDeletingAccount.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Profile</h2>
        <p class="mt-0.5 text-sm text-gray-400">Update your profile settings</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5">
        <form class="space-y-4" @submit.prevent="handleSaveUsername">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
              >Username</label
            >
            <input
              v-model="editUsername"
              type="text"
              :maxlength="MAX_USERNAME_LENGTH"
              placeholder="Your username"
              class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />
          </div>

          <p v-if="usernameError" class="text-sm text-red-600">{{ usernameError }}</p>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              :disabled="isSavingUsername || !editUsername.trim()"
            >
              {{ isSavingUsername ? 'Saving…' : 'Save changes' }}
            </button>
            <p v-if="usernameSuccess" class="text-sm text-emerald-600">Username updated</p>
          </div>
        </form>
      </div>
    </div>

    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Master password</h2>
        <p class="mt-0.5 text-sm text-gray-400">Change the password used to unlock your vault</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5">
        <div
          v-if="passwordSuccess"
          class="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
          Master password successfully updated
        </div>

        <form v-else class="space-y-4" @submit.prevent="handleChangePassword">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Current password
            </label>

            <div class="relative">
              <input
                v-model="currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                required
                :maxlength="MAX_PASSWORD_LENGTH"
                autocomplete="current-password"
                class="w-full rounded-md border px-3 py-1.5 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
              />

              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                @click="showCurrentPassword = !showCurrentPassword"
              >
                <svg
                  v-if="showCurrentPassword"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>

                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              New password
            </label>

            <div class="relative">
              <input
                v-model="newPassword"
                :type="showNewPasswords ? 'text' : 'password'"
                required
                :maxlength="MAX_PASSWORD_LENGTH"
                autocomplete="new-password"
                class="w-full rounded-md border px-3 py-1.5 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                @focus="newPasswordFocused = true"
                @blur="newPasswordFocused = false"
              />

              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                @click="showNewPasswords = !showNewPasswords"
              >
                <svg
                  v-if="showNewPasswords"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>

                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>

            <div
              v-if="newPasswordFocused || newPassword.length > 0"
              class="mt-2.5 grid grid-cols-1 gap-y-1 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-xs"
            >
              <span :class="hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasUpper ? '✓' : '○' }} Uppercase
              </span>

              <span :class="hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasLower ? '✓' : '○' }} Lowercase
              </span>

              <span :class="hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasNumber ? '✓' : '○' }} Number
              </span>

              <span :class="hasSymbol ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasSymbol ? '✓' : '○' }} Symbol
              </span>

              <span
                :class="passwordMinOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
              >
                {{ passwordMinOk ? '✓' : '○' }} {{ MIN_PASSWORD_LENGTH }}+ characters
              </span>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Confirm new password
            </label>

            <input
              v-model="confirmPassword"
              :type="showNewPasswords ? 'text' : 'password'"
              required
              :maxlength="MAX_PASSWORD_LENGTH"
              autocomplete="new-password"
              class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />

            <p v-if="passwordMismatch" class="mt-1.5 text-xs text-red-600">
              Passwords do not match.
            </p>
          </div>

          <p v-if="passwordError" class="text-sm text-red-600">
            {{ passwordError }}
          </p>

          <button
            type="submit"
            class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            :disabled="!canSubmit"
          >
            {{ isChangingPassword ? 'Saving…' : 'Update password' }}
          </button>
        </form>
      </div>
    </div>

    <div
      v-if="!org.isOrganization"
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">
          Switch to organization
        </h2>
        <p class="mt-0.5 text-sm text-gray-400">
          Turn this instance into a company workspace with roles, invites, and admin controls
        </p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Organization mode adds admin / member roles, an Organization admin area, white-label
          branding, invite-only registration, suspend, and an audit log. You become the owner of the
          organization.
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          You can return to personal mode later from the Organization area, but doing so permanently
          deletes every other account and all organization data. Your own account and vault are
          kept.
        </p>
        <button
          type="button"
          class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 cursor-pointer"
          @click="showSwitchModal = true"
        >
          Switch to organization…
        </button>
      </div>
    </div>

    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Delete account</h2>
        <p class="mt-0.5 text-sm text-gray-400">
          Permanently remove your account and all associated data
        </p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5">
        <form class="space-y-4" @submit.prevent="handleDeleteAccount">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Current password
            </label>

            <div class="relative">
              <input
                v-model="deletePassword"
                :type="showDeletePassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="w-full rounded-md border px-3 py-1.5 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
              />

              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                @click="showDeletePassword = !showDeletePassword"
              >
                <svg
                  v-if="showDeletePassword"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>

                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <p v-if="deletePasswordError" class="text-sm text-red-600">
            {{ deletePasswordError }}
          </p>

          <button
            type="submit"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            :disabled="isDeletingAccount || !deletePassword.trim()"
          >
            {{ isDeletingAccount && !showDeleteModal ? 'Validating…' : 'Delete account' }}
          </button>
        </form>
      </div>

      <Teleport to="body">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="showDeleteModal = false"
        >
          <div
            class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
          >
            <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Delete account?</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              This permanently deletes your account and <strong>all associated data</strong> —
              passwords, cards, notes, and categories. This action
              <strong>cannot be undone</strong>.
            </p>
            <div class="mt-5 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
                :disabled="isDeletingAccount"
                @click="showDeleteModal = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isDeletingAccount"
                @click="confirmDeleteAccount"
              >
                {{ isDeletingAccount ? 'Deleting…' : 'Delete account' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>

    <Teleport to="body">
      <div
        v-if="showSwitchModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showSwitchModal = false"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Switch to organization mode?
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This instance will gain roles, an admin area, invites, suspend, and an audit log. Your
            account becomes the owner of the organization. Existing vault data is kept.
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            You can return to personal mode later from the Organization area, but doing so
            permanently deletes every other account and all organization data. Your own account and
            vault are kept.
          </p>
          <p v-if="switchError" class="mt-3 text-sm text-red-600">{{ switchError }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isSwitching"
              @click="showSwitchModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isSwitching"
              @click="confirmSwitchToOrganization"
            >
              {{ isSwitching ? 'Switching…' : 'Switch to organization' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

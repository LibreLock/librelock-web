<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useAuthStore, fetchKdfParams } from '@/stores/auth'
import { deriveKeys, unwrapKey } from '@/services/crypto'
import {
  PrfUnsupportedError,
  UserCancelledError,
  enrollBiometric,
  getBiometricRecord,
  isBiometricSupported,
  removeBiometric,
  type BiometricRecord,
} from '@/services/biometric'
import { toast } from '@/composables/useToast'
import { MAX_PASSWORD_LENGTH } from '@/constants'
import PasswordVisibilityToggle from '@/components/PasswordVisibilityToggle.vue'
import FingerprintIcon from '@/components/icons/FingerprintIcon.vue'

const auth = useAuthStore()

const supported = ref(false)
const checking = ref(true)
const record = ref<BiometricRecord | null>(null)

const password = ref('')
const showPassword = ref(false)
const showEnrollForm = ref(false)
const isEnrolling = ref(false)
const enrollError = ref<string | null>(null)

const enrolledOn = computed(() =>
  record.value ? new Date(record.value.createdAt).toLocaleDateString() : '',
)

async function load() {
  const username = auth.user?.username
  record.value = username ? await getBiometricRecord(username) : null
}

onMounted(async () => {
  supported.value = await isBiometricSupported()
  await load()
  checking.value = false
})

function openEnrollForm() {
  enrollError.value = null
  password.value = ''
  showEnrollForm.value = true
}

async function handleEnroll() {
  enrollError.value = null
  isEnrolling.value = true
  try {
    const username = auth.user?.username
    const protectedKey = auth.user?.protected_key
    if (!username || !protectedKey) throw new Error('Not logged in.')

    // Re-authenticate rather than keeping the MasterKey around after login: the whole session
    // otherwise has no reason to hold password-equivalent bytes in memory
    const kdfParams = await fetchKdfParams(username)
    const { wrappingKey, masterKeyBytes } = await deriveKeys(password.value, kdfParams)
    // Proves the password was right without asking the server, exactly as the delete-account flow does
    await unwrapKey(protectedKey, wrappingKey)

    await enrollBiometric(username, masterKeyBytes)
    password.value = ''
    showEnrollForm.value = false
    await load()
    toast.success('Fingerprint unlock is on for this device')
  } catch (err) {
    if (err instanceof UserCancelledError) {
      enrollError.value = null
    } else if (err instanceof PrfUnsupportedError) {
      enrollError.value = err.message
      supported.value = false
    } else if (err instanceof Error && err.name === 'OperationError') {
      enrollError.value = 'Incorrect master password.'
    } else {
      enrollError.value =
        err instanceof Error ? err.message : 'Could not set up fingerprint unlock.'
    }
  } finally {
    isEnrolling.value = false
  }
}

async function handleRemove() {
  const username = auth.user?.username
  if (!username) return
  await removeBiometric(username)
  await load()
  toast.success('Fingerprint unlock removed from this device')
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07]"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Fingerprint unlock</h2>
        <p class="mt-0.5 text-sm text-gray-400">
          Reopen LibreLock on this device with your fingerprint, face, or device PIN instead of
          typing your master password
        </p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-white/[0.08]" />

      <div class="px-4 sm:px-6 py-5 space-y-4">
        <p v-if="checking" class="text-sm text-gray-400">Checking this device…</p>

        <!-- Enrolled -->
        <template v-else-if="record">
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-white"
            >
              <FingerprintIcon class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">On for this device</p>
              <p class="text-sm text-gray-400">Set up {{ enrolledOn }}</p>
            </div>
          </div>

          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 dark:ring-red-900/50 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            @click="handleRemove"
          >
            Remove from this device
          </button>
        </template>

        <!-- Not available here -->
        <p v-else-if="!supported" class="text-sm text-gray-500 dark:text-gray-400">
          {{
            enrollError ||
            'This device has no authenticator that supports the PRF extension LibreLock needs to derive the unlock key. Your master password stays the only login method.'
          }}
        </p>

        <!-- Available, not enrolled -->
        <template v-else>
          <button
            v-if="!showEnrollForm"
            type="button"
            class="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
            @click="openEnrollForm"
          >
            <FingerprintIcon class="h-5 w-5" />
            Set up fingerprint unlock
          </button>

          <form v-else class="space-y-4" @submit.prevent="handleEnroll">
            <div>
              <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
                >Confirm your master password</label
              >
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  :maxlength="MAX_PASSWORD_LENGTH"
                  autocomplete="current-password"
                  class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm pr-10 border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
                />
                <PasswordVisibilityToggle v-model="showPassword" />
              </div>
            </div>

            <p v-if="enrollError" class="text-sm text-red-600">{{ enrollError }}</p>

            <div class="flex items-center gap-3">
              <button
                type="submit"
                class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                :disabled="isEnrolling || !password"
              >
                {{ isEnrolling ? 'Setting up…' : 'Continue' }}
              </button>
              <button
                type="button"
                class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors"
                @click="showEnrollForm = false"
              >
                Cancel
              </button>
            </div>
          </form>
        </template>

        <div
          class="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400"
        >
          <p>
            Your master password is stored on this device, encrypted with a key that only your
            authenticator can produce and only after it verifies you. It is never sent anywhere, and
            it does not travel to your other devices even if your passkeys sync.
          </p>
          <p class="mt-2">
            Careful! Anyone who can unlock this device can therefore open your vault.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

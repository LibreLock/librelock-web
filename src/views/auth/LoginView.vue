<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import AppBrand from '@/components/AppBrand.vue'
import AppSupportLinks from '@/components/AppSupportLinks.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useOrganizationStore } from '@/stores/organization'
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '@/constants'
import { listBiometricRecords, type BiometricRecord } from '@/services/biometric'
import FingerprintIcon from '@/components/icons/FingerprintIcon.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'

const org = useOrganizationStore()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

// Accounts enrolled for fingerprint unlock on this device (the record is local, so this is empty
// on every other device and the password form is all anyone sees there)
const enrolled = ref<BiometricRecord[]>([])
// Shown once the user picks the password instead, or when nothing is enrolled here
const showPasswordForm = ref(true)

onMounted(async () => {
  auth.clearError()
  // Refetch so the sign-up link reflects the instance's current setting, not the one cached at app start
  org.load()

  enrolled.value = await listBiometricRecords()
  const first = enrolled.value[0]
  if (first) {
    showPasswordForm.value = false
    form.username = first.username
  }
})

async function unlock(username: string) {
  auth.sessionExpired = false
  try {
    await auth.unlockWithBiometrics(username)
    await router.replace(redirectPath.value)
  } catch {
    // The store has already classified this: a cancelled prompt leaves no error, a dead
    // enrollment clears itself. Reflect whatever survived
    enrolled.value = await listBiometricRecords()
    if (!enrolled.value.length) showPasswordForm.value = true
  }
}

function useMasterPassword() {
  auth.clearError()
  showPasswordForm.value = true
}

const form = reactive({
  username: '',
  password: '',
})

const showPassword = ref(false)

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.trim() ? redirect : '/'
})

// Personal instance with sign-up switched off: don't offer a link to a form that cannot succeed
const signUpClosed = computed(() => !org.isOrganization && org.registration === 'closed')

// True when a 401 bounced the user here
// Lives in the auth store (in-memory), so a manual refresh clears it
const sessionExpired = computed(() => auth.sessionExpired)

async function handleSubmit() {
  auth.sessionExpired = false
  try {
    await auth.logIn(form.username.trim(), form.password)
    await router.replace(redirectPath.value)
  } catch {}
}
</script>

<template>
  <div
    class="relative isolate min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-gray-950"
  >
    <div class="auth-backdrop" aria-hidden="true" />
    <ThemeToggle
      class="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] sm:right-5 sm:top-5"
    />
    <div class="mb-8 flex flex-col items-center gap-3">
      <AppBrand
        size="lg"
        name-class="break-words text-[17px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-gray-100"
        class="flex-col! gap-2!"
      />
      <p
        v-if="org.loginMessage"
        class="max-w-md text-center text-sm text-gray-500 dark:text-gray-400"
      >
        {{ org.loginMessage }}
      </p>
    </div>

    <div
      class="w-full max-w-[400px] rounded-2xl bg-white px-6 pb-6 pt-7 shadow-md ring-1 ring-gray-900/[0.05] sm:px-7 dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
    >
      <h1 class="mb-5 text-[22px] font-semibold text-gray-900 dark:text-gray-50">Log in</h1>

      <p
        v-if="sessionExpired"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400"
      >
        Session expired. Please log in again.
      </p>

      <div v-if="enrolled.length" class="space-y-3">
        <button
          v-for="record in enrolled"
          :key="record.username"
          type="button"
          :disabled="auth.isSubmitting"
          class="w-full flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          @click="unlock(record.username)"
        >
          <LoadingSpinner v-if="auth.isSubmitting" size="sm" />
          <FingerprintIcon v-else class="h-5 w-5 shrink-0" />
          Unlock as {{ record.username }}
        </button>

        <button
          v-if="!showPasswordForm"
          type="button"
          class="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors"
          @click="useMasterPassword"
        >
          Use master password instead
        </button>
      </div>

      <p
        v-if="enrolled.length && !showPasswordForm && auth.error"
        class="mt-4 text-sm text-red-600"
      >
        {{ auth.error }}
      </p>

      <form
        v-show="showPasswordForm"
        class="space-y-4"
        :class="enrolled.length ? 'mt-6' : ''"
        @submit.prevent="handleSubmit"
      >
        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
            >Username</label
          >
          <input
            v-model="form.username"
            type="text"
            required
            :maxlength="MAX_USERNAME_LENGTH"
            autocomplete="username"
            class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
            >Password</label
          >
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              :maxlength="MAX_PASSWORD_LENGTH"
              autocomplete="current-password"
              class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm pr-10 border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <PhEyeSlash :size="16" v-if="showPassword" />
              <PhEye :size="16" v-else />
            </button>
          </div>
        </div>

        <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>

        <button
          :disabled="auth.isSubmitting"
          class="w-full flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <LoadingSpinner v-if="auth.isSubmitting" size="sm" />
          {{ auth.isSubmitting ? 'Logging in...' : 'Log in' }}
        </button>
      </form>

      <p v-if="!signUpClosed" class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        No account?
        <RouterLink
          to="/register"
          class="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:decoration-gray-900 dark:text-gray-100 dark:decoration-gray-600 dark:hover:decoration-gray-100"
          >Create one</RouterLink
        >
      </p>
    </div>

    <AppSupportLinks />
  </div>
</template>

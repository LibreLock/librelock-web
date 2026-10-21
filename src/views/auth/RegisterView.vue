<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import AppBrand from '@/components/AppBrand.vue'
import AppSupportLinks from '@/components/AppSupportLinks.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '@/constants'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'
const auth = useAuthStore()
const org = useOrganizationStore()
const router = useRouter()
const route = useRoute()

// Invite-only registration: token comes from the ?invite= link or manual entry
const inviteRequired = computed(() => org.isOrganization && org.registration === 'invite')

// Personal instance whose owner has not opened sign-up: the form would only ever 403
const signUpClosed = computed(() => !org.isOrganization && org.registration === 'closed')

const form = reactive({
  username: '',
  password: '',
  repeatPassword: '',
  inviteToken: '',
})

onMounted(() => {
  auth.clearError()
  // Refetch: the store is loaded once at app start, so a tab left open here would still show the
  // sign-up state from before the operator changed it
  org.load()
  const q = route.query.invite
  if (typeof q === 'string') form.inviteToken = q
})

const localError = ref('')

const passwordTooShort = computed(
  () => form.password.length > 0 && form.password.length < MIN_PASSWORD_LENGTH,
)
const passwordMismatch = computed(
  () => form.repeatPassword.length > 0 && form.password !== form.repeatPassword,
)

const hasUpper = computed(() => /[A-Z]/.test(form.password))
const hasLower = computed(() => /[a-z]/.test(form.password))
const hasNumber = computed(() => /[0-9]/.test(form.password))
const hasSymbol = computed(() => /[^A-Za-z0-9]/.test(form.password))
const passwordMinOk = computed(() => form.password.length >= MIN_PASSWORD_LENGTH)

const passwordFocused = ref(false)
const showPassword = ref(false)

const canSubmit = computed(
  () =>
    !auth.isSubmitting &&
    !passwordTooShort.value &&
    !passwordMismatch.value &&
    hasUpper.value &&
    hasLower.value &&
    hasNumber.value &&
    hasSymbol.value &&
    passwordMinOk.value &&
    (!inviteRequired.value || form.inviteToken.trim().length > 0),
)

async function handleSubmit() {
  localError.value = ''
  if (passwordTooShort.value) {
    localError.value = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    return
  }
  if (passwordMismatch.value) {
    localError.value = 'Passwords do not match.'
    return
  }

  try {
    await auth.register(
      form.username.trim(),
      form.password,
      inviteRequired.value ? form.inviteToken.trim() : undefined,
    )
    await router.replace('/')
  } catch {
    // error displayed via auth.error
  }
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
    </div>

    <div
      class="w-full max-w-[400px] rounded-2xl bg-white px-6 pb-6 pt-7 shadow-md ring-1 ring-gray-900/[0.05] sm:px-7 dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
    >
      <h1 class="mb-5 text-[22px] font-semibold text-gray-900 dark:text-gray-50">Create account</h1>

      <!-- Wait for the instance state before deciding: the fallback is "open", so rendering early would flash the form on a closed instance -->
      <div v-if="!org.loaded" class="flex justify-center py-6">
        <LoadingSpinner />
      </div>

      <div v-else-if="signUpClosed" class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          This instance is not accepting new accounts. Ask whoever runs it to allow sign-up from
          their settings.
        </p>
        <RouterLink
          to="/login"
          class="inline-block rounded-md bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 text-sm font-semibold transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          Back to login
        </RouterLink>
      </div>

      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <div v-if="inviteRequired">
          <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300"
            >Invite code</label
          >
          <input
            v-model="form.inviteToken"
            type="text"
            required
            placeholder="Paste your invite code"
            class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
          />
          <p class="mt-1 text-xs text-gray-400">Registration is invite-only.</p>
        </div>
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
            >Master Password</label
          >
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              :maxlength="MAX_PASSWORD_LENGTH"
              autocomplete="new-password"
              class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm pr-10 border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
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
          <div
            v-if="passwordFocused"
            class="mt-2.5 grid grid-cols-1 gap-y-1 rounded-lg border border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-xs"
          >
            <ul class="space-y-1">
              <li :class="hasUpper ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasUpper ? '✓' : '○' }} Uppercase
              </li>
              <li :class="hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasLower ? '✓' : '○' }} Lowercase
              </li>
              <li :class="hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasNumber ? '✓' : '○' }} Number
              </li>
              <li :class="hasSymbol ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'">
                {{ hasSymbol ? '✓' : '○' }} Symbol
              </li>
              <li
                :class="passwordMinOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
              >
                {{ passwordMinOk ? '✓' : '○' }} {{ MIN_PASSWORD_LENGTH }}+ characters
              </li>
            </ul>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
            Repeat master password
          </label>
          <div class="relative">
            <input
              v-model="form.repeatPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              :maxlength="MAX_PASSWORD_LENGTH"
              autocomplete="new-password"
              class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm pr-10 border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
              :aria-label="showPassword ? 'Hide confirm password' : 'Show confirm password'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <PhEyeSlash :size="16" v-if="showPassword" />
              <PhEye :size="16" v-else />
            </button>
          </div>
          <p v-if="passwordMismatch" class="mt-1 text-xs text-red-600">Passwords do not match</p>
        </div>

        <p v-if="localError" class="text-sm text-red-600">{{ localError }}</p>
        <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>

        <button
          :disabled="!canSubmit"
          class="w-full flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <LoadingSpinner v-if="auth.isSubmitting" size="sm" />
          {{ auth.isSubmitting ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p v-if="!signUpClosed" class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?
        <RouterLink
          to="/login"
          class="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 transition-colors hover:decoration-gray-900 dark:text-gray-100 dark:decoration-gray-600 dark:hover:decoration-gray-100"
          >Log in</RouterLink
        >
      </p>
    </div>

    <AppSupportLinks />
  </div>
</template>

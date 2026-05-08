<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import IconPadlock from '@/components/icons/IconPadlock.vue'
const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  username: '',
  password: '',
  repeatPassword: '',
})

const MIN_PASSWORD_LENGTH = 12

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
    passwordMinOk.value,
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
    await auth.signUp(form.username.trim(), form.password)
    await router.replace('/')
  } catch {
    // error displayed via auth.error
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
    <div class="mb-4 flex flex-col items-center gap-2">
      <IconPadlock size="lg" />
      <span class="text-lg font-semibold text-slate-600">Vault</span>
    </div>

    <div class="w-full max-w-md bg-white rounded-lg shadow-sm p-6">
      <h1 class="text-2xl font-semibold mb-4">Create account</h1>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-500"> Username </label>
          <input
            v-model="form.username"
            type="text"
            required
            autocomplete="username"
            class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-500"> Password </label>
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              class="w-full rounded-md border px-3 py-1 pr-10 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
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
          <div v-if="passwordFocused" class="mt-2 text-sm">
            <p class="text-slate-500">
              Choose a secure master password — at least {{ MIN_PASSWORD_LENGTH }} characters.
            </p>
            <ul class="mt-2 space-y-1">
              <li :class="hasUpper ? 'text-emerald-600' : 'text-slate-400'">
                {{ hasUpper ? '✓' : '○' }} Uppercase letter
              </li>
              <li :class="hasLower ? 'text-emerald-600' : 'text-slate-400'">
                {{ hasLower ? '✓' : '○' }} Lowercase letter
              </li>
              <li :class="hasNumber ? 'text-emerald-600' : 'text-slate-400'">
                {{ hasNumber ? '✓' : '○' }} Number
              </li>
              <li :class="hasSymbol ? 'text-emerald-600' : 'text-slate-400'">
                {{ hasSymbol ? '✓' : '○' }} Symbol (e.g. !@#$%)
              </li>
              <li :class="passwordMinOk ? 'text-emerald-600' : 'text-slate-400'">
                {{ passwordMinOk ? '✓' : '○' }} At least {{ MIN_PASSWORD_LENGTH }} characters
              </li>
            </ul>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-500"> Repeat password </label>
          <div class="relative">
            <input
              v-model="form.repeatPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="new-password"
              class="w-full rounded-md border px-3 py-1 pr-10 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              @click="showPassword = !showPassword"
            >
              <svg
                v-if="showPassword"
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
          <p v-if="passwordMismatch" class="mt-1 text-xs text-rose-600">Passwords do not match.</p>
        </div>

        <p v-if="localError" class="text-sm text-rose-600">{{ localError }}</p>
        <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>

        <button
          :disabled="!canSubmit"
          class="w-full rounded-md bg-slate-800 hover:bg-slate-700 text-white py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ auth.isSubmitting ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-slate-600">
        Already have an account?
        <RouterLink to="/login" class="text-blue-600 font-semibold">Log in</RouterLink>
      </p>
    </div>
  </div>
</template>

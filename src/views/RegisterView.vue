<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  password: '',
  repeatPassword: '',
})

const MIN_PASSWORD_LENGTH = 12

const passwordHint = computed(
  () => `Choose a secure master password - at least ${MIN_PASSWORD_LENGTH} characters.`,
)

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

  await auth.signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password })
  await router.replace('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <div class="w-full max-w-md bg-white rounded-lg shadow-sm p-6">
      <h1 class="text-2xl font-semibold mb-4">Register</h1>

      <form class="space-y-3" @submit.prevent="handleSubmit">
        <input
          v-model="form.name"
          type="text"
          placeholder="Name"
          required
          class="w-full rounded-md border px-3 py-2 border-slate-400"
        />
        <input
          v-model="form.email"
          type="email"
          placeholder="Email"
          required
          class="w-full rounded-md border px-3 py-2 border-slate-400"
        />
        <input
          v-model="form.password"
          type="password"
          placeholder="Password"
          required
          @focus="passwordFocused = true"
          @blur="passwordFocused = false"
          class="w-full rounded-md border px-3 py-2 border-slate-400"
        />

        <!-- Password checklist shown while focused -->
        <div v-if="passwordFocused" class="mt-2 text-sm">
          <p class="text-sm text-slate-500">{{ passwordHint }}</p>
          <ul class="mt-2 space-y-1">
            <li :class="hasUpper ? 'text-emerald-600' : 'text-slate-500'">
              {{ hasUpper ? '✓' : '○' }} Uppercase letter
            </li>
            <li :class="hasLower ? 'text-emerald-600' : 'text-slate-500'">
              {{ hasLower ? '✓' : '○' }} Lowercase letter
            </li>
            <li :class="hasNumber ? 'text-emerald-600' : 'text-slate-500'">
              {{ hasNumber ? '✓' : '○' }} Number
            </li>
            <li :class="hasSymbol ? 'text-emerald-600' : 'text-slate-500'">
              {{ hasSymbol ? '✓' : '○' }} Symbol (e.g. !@#$%)
            </li>
            <li :class="passwordMinOk ? 'text-emerald-600' : 'text-slate-500'">
              {{ passwordMinOk ? '✓' : '○' }} At least {{ MIN_PASSWORD_LENGTH }} characters
            </li>
          </ul>
        </div>

        <input
          v-model="form.repeatPassword"
          type="password"
          placeholder="Repeat password"
          required
          class="w-full rounded-md border px-3 py-2 border-slate-400"
        />
        <p v-if="passwordMismatch" class="text-sm text-rose-600">Passwords do not match.</p>
        <p v-if="localError" class="text-sm text-rose-600">{{ localError }}</p>
        <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>

        <button
          :disabled="!canSubmit"
          class="w-full rounded-md bg-gray-600 text-white py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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

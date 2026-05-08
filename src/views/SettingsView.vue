<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSuccess = ref(false)
const isChangingPassword = ref(false)
const newPasswordFocused = ref(false)

const MIN_PASSWORD_LENGTH = 12

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
    await apiRequest('/me/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: currentPassword.value,
        new_password: newPassword.value,
      }),
    })
    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    passwordError.value = err instanceof ApiError ? err.message : 'Failed to change password.'
  } finally {
    isChangingPassword.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-semibold mb-6">Settings</h1>

    <div class="max-w-md space-y-8">
      <!-- Security section -->
      <div>
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Security</h2>
        <div class="rounded-lg bg-white shadow-sm p-6">
          <h3 class="text-lg font-semibold mb-4">Change master password</h3>

          <div v-if="passwordSuccess" class="text-sm text-slate-600">
            Master password updated successfully.
          </div>

          <form v-else class="space-y-4" @submit.prevent="handleChangePassword">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">
                Current password
              </label>
              <input
                v-model="currentPassword"
                type="password"
                required
                autocomplete="current-password"
                class="w-full rounded-md border px-3 py-2 border-slate-400"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600"> New password </label>
              <input
                v-model="newPassword"
                type="password"
                required
                autocomplete="new-password"
                class="w-full rounded-md border px-3 py-2 border-slate-400"
                @focus="newPasswordFocused = true"
                @blur="newPasswordFocused = false"
              />
              <div v-if="newPasswordFocused" class="mt-2 text-sm">
                <p class="text-slate-500">
                  At least {{ MIN_PASSWORD_LENGTH }} characters with uppercase, number, and symbol.
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
              <label class="mb-1 block text-xs font-medium text-slate-600">
                Confirm new password
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                class="w-full rounded-md border px-3 py-2 border-slate-400"
              />
              <p v-if="passwordMismatch" class="mt-1 text-xs text-rose-600">
                Passwords do not match.
              </p>
            </div>

            <p v-if="passwordError" class="text-sm text-rose-600">{{ passwordError }}</p>

            <button
              type="submit"
              class="w-full rounded-md bg-gray-600 text-white py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              :disabled="!canSubmit"
            >
              {{ isChangingPassword ? 'Saving...' : 'Update password' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

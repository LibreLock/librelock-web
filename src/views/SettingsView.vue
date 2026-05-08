<script setup lang="ts">
import { computed, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

type Tab = 'account' | 'security'
const activeTab = ref<Tab>('account')

// Account tab
const editName = ref(auth.user?.name ?? '')
const nameError = ref<string | null>(null)
const nameSuccess = ref(false)
const isSavingName = ref(false)

async function handleSaveName() {
  nameError.value = null
  nameSuccess.value = false
  isSavingName.value = true
  try {
    await apiRequest('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: editName.value.trim() }),
    })
    await auth.refreshSession()
    nameSuccess.value = true
  } catch (err) {
    nameError.value = err instanceof ApiError ? err.message : 'Failed to update name.'
  } finally {
    isSavingName.value = false
  }
}

// Security tab
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordSuccess = ref(false)
const isChangingPassword = ref(false)
const newPasswordFocused = ref(false)
const showNewPassword = ref(false)

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
    await apiRequest('/auth/me/password', {
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
  <div class="overflow-y-auto h-full p-6">
    <div class="max-w-lg">
      <h1 class="text-2xl font-semibold text-slate-900">Settings</h1>
      <p class="mt-1 mb-6 text-sm text-slate-400">Manage your account and security preferences.</p>

      <!-- Tabs -->
      <div class="mb-6 flex gap-1 border-b border-slate-200">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="activeTab === 'account'
            ? 'border-slate-800 text-slate-900'
            : 'border-transparent text-slate-400 hover:text-slate-700'"
          @click="activeTab = 'account'"
        >
          Account
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="activeTab === 'security'
            ? 'border-slate-800 text-slate-900'
            : 'border-transparent text-slate-400 hover:text-slate-700'"
          @click="activeTab = 'security'"
        >
          Security
        </button>
      </div>

      <!-- Account tab -->
      <div v-if="activeTab === 'account'" class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div class="px-6 pt-6 pb-1">
          <h2 class="text-base font-semibold text-slate-800">Profile</h2>
          <p class="mt-0.5 text-sm text-slate-400">Update your display name.</p>
        </div>

        <hr class="mt-5 border-slate-100" />

        <div class="px-6 py-5">
          <!-- Read-only email -->
          <div class="mb-4">
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email</label>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 select-all">
              {{ auth.user?.email ?? '—' }}
            </div>
          </div>

          <div v-if="nameSuccess" class="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Name updated successfully.
          </div>

          <form class="space-y-4" @submit.prevent="handleSaveName">
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Display name</label>
              <input
                v-model="editName"
                type="text"
                placeholder="Your name"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
              />
            </div>

            <p v-if="nameError" class="text-sm text-rose-600">{{ nameError }}</p>

            <button
              type="submit"
              class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              :disabled="isSavingName || !editName.trim()"
            >
              {{ isSavingName ? 'Saving…' : 'Save changes' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Security tab -->
      <div v-if="activeTab === 'security'" class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div class="px-6 pt-6 pb-1">
          <h2 class="text-base font-semibold text-slate-800">Master password</h2>
          <p class="mt-0.5 text-sm text-slate-400">Change the password used to unlock your vault.</p>
        </div>

        <hr class="mt-5 border-slate-100" />

        <div class="px-6 py-5">
          <div v-if="passwordSuccess" class="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Master password updated successfully.
          </div>

          <form v-else class="space-y-4" @submit.prevent="handleChangePassword">
            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Current password
              </label>
              <input
                v-model="currentPassword"
                type="password"
                required
                autocomplete="current-password"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                New password
              </label>
              <div class="relative">
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  required
                  autocomplete="new-password"
                  class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  @focus="newPasswordFocused = true"
                  @blur="newPasswordFocused = false"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  @click="showNewPassword = !showNewPassword"
                >
                  <svg v-if="showNewPassword" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>

              <div v-if="newPasswordFocused || newPassword.length > 0" class="mt-2.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <ul class="space-y-1 text-xs">
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
                    {{ hasSymbol ? '✓' : '○' }} Symbol
                  </li>
                  <li :class="passwordMinOk ? 'text-emerald-600' : 'text-slate-400'">
                    {{ passwordMinOk ? '✓' : '○' }} At least {{ MIN_PASSWORD_LENGTH }} characters
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Confirm new password
              </label>
              <input
                v-model="confirmPassword"
                type="password"
                required
                autocomplete="new-password"
                class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
              />
              <p v-if="passwordMismatch" class="mt-1.5 text-xs text-rose-600">Passwords do not match.</p>
            </div>

            <p v-if="passwordError" class="text-sm text-rose-600">{{ passwordError }}</p>

            <button
              type="submit"
              class="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              :disabled="!canSubmit"
            >
              {{ isChangingPassword ? 'Saving…' : 'Update password' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

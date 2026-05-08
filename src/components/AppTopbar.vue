<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const settingsOpen = ref(false)
const searchQuery = ref('')

const modalOpen = ref(false)
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

function openModal() {
  settingsOpen.value = false
  modalOpen.value = true
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  passwordError.value = null
  passwordSuccess.value = false
}

function closeModal() {
  modalOpen.value = false
}

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
  } catch (err) {
    passwordError.value = err instanceof ApiError ? err.message : 'Failed to change password.'
  } finally {
    isChangingPassword.value = false
  }
}

async function handleLogout() {
  settingsOpen.value = false
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <header
    class="flex h-14 flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4"
  >
    <!-- Search bar -->
    <div class="relative w-full max-w-md">
      <svg
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search vault..."
        class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </div>

    <div class="ml-auto flex items-center gap-3">
      <RouterLink
        to="/vault/new"
        class="flex items-center gap-2 rounded-md bg-gray-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add entry
      </RouterLink>
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        @click="settingsOpen = !settingsOpen"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      <!-- Click-away overlay -->
      <div v-if="settingsOpen" class="fixed inset-0 z-40" @click="settingsOpen = false" />

      <!-- Dropdown -->
      <div
        v-if="settingsOpen"
        class="absolute right-0 top-11 z-50 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
      >
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
          @click="openModal"
        >
          <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
          Change password
        </button>
        <hr class="my-1 border-slate-100" />
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
          @click="handleLogout"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Log out
        </button>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold">Change master password</h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
            @click="closeModal"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div v-if="passwordSuccess" class="text-sm text-slate-600">
          Master password updated successfully.
        </div>

        <form v-else class="space-y-3" @submit.prevent="handleChangePassword">
          <input
            v-model="currentPassword"
            type="password"
            placeholder="Current password"
            required
            autocomplete="current-password"
            class="w-full rounded-md border px-3 py-2 border-slate-400"
          />
          <input
            v-model="newPassword"
            type="password"
            placeholder="New password"
            required
            autocomplete="new-password"
            class="w-full rounded-md border px-3 py-2 border-slate-400"
            @focus="newPasswordFocused = true"
            @blur="newPasswordFocused = false"
          />

          <div v-if="newPasswordFocused" class="text-sm">
            <p class="text-slate-500">
              Choose a secure master password — at least {{ MIN_PASSWORD_LENGTH }} characters.
            </p>
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
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            required
            autocomplete="new-password"
            class="w-full rounded-md border px-3 py-2 border-slate-400"
          />
          <p v-if="passwordMismatch" class="text-sm text-rose-600">Passwords do not match.</p>

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
  </Teleport>
</template>

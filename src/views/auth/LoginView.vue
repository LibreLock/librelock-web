<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import AppBrand from '@/components/AppBrand.vue'
import AppSupportLinks from '@/components/AppSupportLinks.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useOrganizationStore } from '@/stores/organization'
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '@/constants'

const org = useOrganizationStore()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

onMounted(() => auth.clearError())

const form = reactive({
  username: '',
  password: '',
})

const showPassword = ref(false)

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.trim() ? redirect : '/'
})

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
    class="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-950"
  >
    <div class="mb-4 flex flex-col items-center gap-2">
      <AppBrand
        size="lg"
        name-class="text-lg font-semibold text-gray-600 dark:text-gray-300"
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
      class="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-6"
    >
      <h1 class="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Log in</h1>

      <p
        v-if="sessionExpired"
        class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400"
      >
        Session expired. Please log in again.
      </p>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
            >Username</label
          >
          <input
            v-model="form.username"
            type="text"
            required
            :maxlength="MAX_USERNAME_LENGTH"
            autocomplete="username"
            class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
            >Password</label
          >
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              :maxlength="MAX_PASSWORD_LENGTH"
              autocomplete="current-password"
              class="w-full rounded-md border px-3 py-1.5 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />
            <button
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
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
        </div>

        <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>

        <button
          :disabled="auth.isSubmitting"
          class="w-full flex items-center justify-center gap-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <LoadingSpinner v-if="auth.isSubmitting" size="sm" />
          {{ auth.isSubmitting ? 'Logging in...' : 'Log in' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
        No account?
        <RouterLink to="/register" class="text-blue-600 dark:text-blue-400 font-semibold"
          >Create one</RouterLink
        >
      </p>
    </div>

    <AppSupportLinks />
  </div>
</template>

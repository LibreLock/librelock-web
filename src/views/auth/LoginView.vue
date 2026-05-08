<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import IconPadlock from '@/components/icons/IconPadlock.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  username: '',
  password: '',
})

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.trim() ? redirect : '/'
})

async function handleSubmit() {
  try {
    await auth.signIn(form.username.trim(), form.password)
    await router.replace(redirectPath.value)
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
      <h1 class="text-2xl font-semibold mb-4">Log in</h1>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600"> Username </label>
          <input
            v-model="form.username"
            type="text"
            required
            autocomplete="username"
            class="w-full rounded-md border px-3 py-2 border-slate-400"
          />
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600"> Password </label>
          <input
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-md border px-3 py-2 border-slate-400"
          />
        </div>

        <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>

        <button
          :disabled="auth.isSubmitting"
          class="w-full rounded-md bg-gray-600 text-white py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          {{ auth.isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-slate-600">
        No account?
        <RouterLink to="/register" class="text-blue-600 font-semibold">Create one</RouterLink>
      </p>
    </div>
  </div>
</template>

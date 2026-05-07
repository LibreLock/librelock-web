<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: '',
})

const redirectPath = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.trim() ? redirect : '/'
})

async function handleSubmit() {
  await auth.signIn({ email: form.email.trim(), password: form.password })
  await router.replace(redirectPath.value)
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <div class="w-full max-w-md bg-white rounded-lg shadow-sm p-6">
      <h1 class="text-2xl font-semibold mb-4">Log in</h1>

      <form class="space-y-3" @submit.prevent="handleSubmit">
        <input
          v-model="form.email"
          type="email"
          placeholder="Email"
          required
          class="w-full rounded-md border px-3 py-2"
        />
        <input
          v-model="form.password"
          type="password"
          placeholder="Password"
          required
          class="w-full rounded-md border px-3 py-2"
        />

        <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>

        <button
          :disabled="auth.isSubmitting"
          class="w-full rounded-md bg-teal-600 text-white py-2 font-semibold"
        >
          {{ auth.isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-slate-600">
        No account?
        <RouterLink to="/register" class="text-teal-600 font-semibold">Create one</RouterLink>
      </p>
    </div>
  </div>
</template>

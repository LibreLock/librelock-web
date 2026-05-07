<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  password: '',
})

const passwordHint = computed(
  () =>
    'Choose a secure master password - at least 12 characters, including uppercase, lowercase, numbers, and symbols.',
)
async function handleSubmit() {
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
          class="w-full rounded-md border px-3 py-2"
        />
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

        <p class="text-sm text-slate-500">{{ passwordHint }}</p>
        <p v-if="auth.error" class="text-sm text-rose-600">{{ auth.error }}</p>

        <button
          :disabled="auth.isSubmitting"
          class="w-full rounded-md bg-teal-600 text-white py-2 font-semibold"
        >
          {{ auth.isSubmitting ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-slate-600">
        Already have an account?
        <RouterLink to="/login" class="text-teal-600 font-semibold">Log in</RouterLink>
      </p>
    </div>
  </div>
</template>

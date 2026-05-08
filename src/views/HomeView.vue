<script setup lang="ts">
import { computed } from 'vue'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const user = computed(() => auth.user)

const accountFields = computed(() => [
  { label: 'Name', value: user.value?.name ?? 'Not set' },
  { label: 'Email', value: user.value?.email ?? 'Not set' },
  { label: 'User ID', value: user.value?.id ?? 'Not set' },
])

async function handleLogout() {
  await auth.signOut()
  window.location.href = '/login'
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p class="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Protected area</p>
        <h1 class="mt-2 text-3xl font-semibold">Welcome, {{ auth.displayName }}</h1>
        <p class="mt-2 max-w-2xl text-sm text-slate-600">
          Your session is active and your account details are loaded from the backend.
        </p>
      </section>

      <section
        class="grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[1.4fr_0.8fr]"
      >
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Account details</h2>
          <dl class="mt-4 space-y-4">
            <div
              v-for="field in accountFields"
              :key="field.label"
              class="rounded-xl bg-slate-50 p-4"
            >
              <dt class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                {{ field.label }}
              </dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900">{{ field.value }}</dd>
            </div>
          </dl>
        </div>

        <div class="flex flex-col justify-between rounded-xl bg-slate-900 p-5 text-white">
          <div>
            <p class="text-sm text-slate-300">Session state</p>
            <p class="mt-2 text-2xl font-semibold">
              {{
                auth.isSessionLoading
                  ? 'Loading...'
                  : auth.isAuthenticated
                    ? 'Authenticated'
                    : 'Guest'
              }}
            </p>
          </div>

          <button
            type="button"
            class="mt-6 inline-flex items-center justify-center rounded-full bg-teal-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-400 disabled:cursor-progress disabled:opacity-70"
            :disabled="auth.isSubmitting"
            @click="handleLogout"
          >
            {{ auth.isSubmitting ? 'Logging out...' : 'Log out' }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50 px-6 py-12">
    <section
      class="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl flex-col rounded-3xl border border-slate-200/70 bg-white/80 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur"
    >
      <div
        class="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700"
      >
        Password Vault
      </div>

      <h1 class="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
        Protect and organize every credential.
      </h1>

      <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
        This is the protected area for your password manager. Once the backend is connected, this
        screen can become the vault, search, and record-management hub.
      </p>

      <div class="mt-8 grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <span class="block text-sm text-slate-500">Encrypted vault</span>
          <strong class="mt-2 block text-base font-semibold text-slate-950"
            >Ready for account data</strong
          >
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <span class="block text-sm text-slate-500">Session state</span>
          <strong class="mt-2 block text-base font-semibold text-slate-950"
            >JWT cookie handled by the server</strong
          >
        </article>
        <article class="rounded-2xl border border-slate-200 bg-white/70 p-4">
          <span class="block text-sm text-slate-500">Next step</span>
          <strong class="mt-2 block text-base font-semibold text-slate-950"
            >Swap these placeholders for API-backed records</strong
          >
        </article>
      </div>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-slate-500">Signed in as {{ auth.displayName }}</p>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-progress disabled:opacity-70"
          @click="handleSignOut"
        >
          Sign out
        </button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

async function handleSignOut() {
  await auth.signOut()
}
</script>

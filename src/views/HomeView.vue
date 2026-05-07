<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-progress disabled:opacity-70"
    @click="handleLogout"
  >
    Log out
  </button>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

async function handleLogout() {
  await auth.signOut()
}
</script>

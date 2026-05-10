<script setup lang="ts">
import type { CardNetwork } from '@/api/vault'

defineProps<{
  network: CardNetwork
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <!-- Mastercard -->
  <div v-if="network === 'mastercard'" class="flex items-center">
    <div
      class="rounded-full bg-red-600"
      :class="size === 'lg' ? 'h-8 w-8' : size === 'md' ? 'h-6 w-6' : 'h-5 w-5'"
    ></div>
    <div
      class="rounded-full bg-amber-500 opacity-90"
      :class="[
        size === 'lg' ? 'h-8 w-8 -ml-4' : size === 'md' ? 'h-6 w-6 -ml-3' : 'h-5 w-5 -ml-2.5',
      ]"
    ></div>
  </div>

  <!-- Visa -->
  <span
    v-else-if="network === 'visa'"
    class="font-black italic tracking-tight text-blue-500 dark:text-blue-400"
    :class="size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-xs'"
    >VISA</span
  >

  <!-- Unknown - generic card icon -->
  <svg
    v-else
    class="stroke-white"
    :class="size === 'lg' ? 'h-8 w-8' : size === 'md' ? 'h-6 w-6' : 'h-5 w-5'"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  </svg>
</template>

<script setup lang="ts">
import { PhCreditCard } from '@phosphor-icons/vue'
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

  <!-- Unknown - generic card icon, the same glyph as Cards in the sidebar -->
  <PhCreditCard v-else class="text-white" :size="size === 'lg' ? 32 : size === 'md' ? 24 : 20" />
</template>

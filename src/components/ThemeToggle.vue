<script setup lang="ts">
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()

const label = computed(() =>
  theme.theme === 'dark' ? 'Dark mode, click for light' : 'Light mode, click for dark',
)
</script>

<template>
  <button
    type="button"
    class="rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 cursor-pointer transition-colors"
    :aria-label="label"
    :title="label"
    @click="theme.toggle()"
  >
    <svg
      v-if="theme.theme === 'dark'"
      class="h-5 w-5 transition-transform duration-300 hover:rotate-12"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8" />
      <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 2.5V4.5" />
        <path d="M12 19.5V21.5" />
        <path d="M2.5 12H4.5" />
        <path d="M19.5 12H21.5" />
        <path d="M18.36 5.64L16.95 7.05" />
        <path d="M7.05 16.95L5.64 18.36" />
        <path d="M18.36 18.36L16.95 16.95" />
        <path d="M7.05 7.05L5.64 5.64" />
      </g>
    </svg>

    <svg
      v-else
      class="h-5 w-5 transition-transform duration-300 hover:-rotate-6"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M21 12.8A8.5 8.5 0 1111.2 3 6.8 6.8 0 0021 12.8Z" />
    </svg>
  </button>
</template>

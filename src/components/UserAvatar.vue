<script setup lang="ts">
defineProps<{ name?: string }>()
</script>

<template>
  <span
    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-gray-600 to-gray-800 text-[13px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] dark:from-gray-500 dark:to-gray-700"
    aria-hidden="true"
  >
    {{ name?.charAt(0).toUpperCase() }}
  </span>
</template>

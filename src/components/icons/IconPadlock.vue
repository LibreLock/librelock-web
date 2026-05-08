<script setup lang="ts">
type IconSize = 'sm' | 'md' | 'lg'

const props = defineProps<{
  size: IconSize
}>()

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
}
</script>

<template>
  <div
    :class="sizeClasses[props.size] || sizeClasses.md"
    class="flex flex-shrink-0 items-center justify-center rounded-lg bg-gray-600 text-white"
  >
    <svg
      :class="iconSizeClasses[props.size] || iconSizeClasses.md"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  </div>
</template>

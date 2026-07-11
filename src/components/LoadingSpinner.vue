<script setup lang="ts">
type SpinnerSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{ size?: SpinnerSize }>(), { size: 'md' })

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
}
</script>

<template>
  <svg
    :class="[sizeClasses[props.size] || sizeClasses.md, 'animate-spin']"
    viewBox="0 0 24 24"
    fill="none"
    role="status"
    aria-label="Loading"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
</template>

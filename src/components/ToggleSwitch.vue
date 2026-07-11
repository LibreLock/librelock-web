<script setup lang="ts">
defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

function toggle(current: boolean) {
  emit('update:modelValue', !current)
  emit('change', !current)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500"
    :class="modelValue ? 'bg-gray-800 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'"
    @click="toggle(modelValue)"
  >
    <span
      class="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 shadow-sm transition-transform"
      :class="modelValue ? 'translate-x-6' : 'translate-x-1'"
    />
  </button>
</template>

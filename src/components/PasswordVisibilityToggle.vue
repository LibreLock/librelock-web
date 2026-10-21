<script setup lang="ts">
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'
defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    :aria-label="modelValue ? 'Hide password' : 'Show password'"
    :aria-pressed="modelValue"
    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
    @click="emit('update:modelValue', !modelValue)"
  >
    <PhEyeSlash :size="16" v-if="modelValue" />

    <PhEye :size="16" v-else />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogIcon } from '@/icons/catalog'

const props = defineProps<{
  icon: CatalogIcon | null
}>()

const strokeColor = computed(() => {
  const icon = props.icon
  if (!icon) return 'none'
  if (icon.mode === 'stroke' || (icon.mode === 'fill' && icon.strokeWidth)) return 'currentColor'
  return 'none'
})

const strokeWidth = computed(() => {
  const icon = props.icon
  if (!icon) return 0
  return icon.mode === 'stroke' ? 2 : (icon.strokeWidth ?? 0)
})
</script>

<template>
  <svg
    v-if="icon"
    viewBox="0 0 24 24"
    :fill="icon.mode === 'fill' ? 'currentColor' : 'none'"
    :fill-rule="icon.fillRule ?? 'nonzero'"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    aria-hidden="true"
  >
    <path
      v-for="(d, i) in icon.paths"
      :key="i"
      :d="d"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

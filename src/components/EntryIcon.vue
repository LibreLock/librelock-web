<script setup lang="ts">
import { computed } from 'vue'
import { resolveEntryIcon } from '@/icons/catalog'

const props = withDefaults(
  defineProps<{
    name: string
    color: string
    /** Explicitly chosen icon id; when absent, brand auto-detection is used. */
    icon?: string | null
    /** Optional URL used to strengthen brand auto-detection. */
    url?: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm', icon: null, url: '' },
)

const resolved = computed(() => resolveEntryIcon(props.name, props.icon, props.url))

const box = computed(() =>
  props.size === 'md' ? 'h-12 w-12 rounded-xl text-lg' : 'h-9 w-9 rounded-lg text-sm',
)
const glyph = computed(() => (props.size === 'md' ? 'h-6 w-6' : 'h-5 w-5'))

// Stroke glyphs draw their outline; fill glyphs may opt into a matching stroke to look heavier
const strokeColor = computed(() => {
  const icon = resolved.value
  if (!icon) return 'none'
  if (icon.mode === 'stroke' || (icon.mode === 'fill' && icon.strokeWidth)) return 'currentColor'
  return 'none'
})
const strokeWidth = computed(() => {
  const icon = resolved.value
  if (!icon) return 0
  return icon.mode === 'stroke' ? 2 : (icon.strokeWidth ?? 0)
})
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center font-bold text-white"
    :class="[box, color]"
  >
    <svg
      v-if="resolved"
      :class="glyph"
      viewBox="0 0 24 24"
      :fill="resolved.mode === 'fill' ? 'currentColor' : 'none'"
      :fill-rule="resolved.fillRule ?? 'nonzero'"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
      aria-hidden="true"
    >
      <path
        v-for="(d, i) in resolved.paths"
        :key="i"
        :d="d"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <template v-else>{{ name.charAt(0).toUpperCase() }}</template>
  </span>
</template>

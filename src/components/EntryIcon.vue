<script setup lang="ts">
import { computed } from 'vue'
import { resolveEntryIcon } from '@/icons/catalog'
import IconGlyph from '@/components/IconGlyph.vue'

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
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center font-bold text-white"
    :class="[box, color]"
  >
    <IconGlyph v-if="resolved" :icon="resolved" :class="glyph" />
    <template v-else>{{ name.charAt(0).toUpperCase() }}</template>
  </span>
</template>

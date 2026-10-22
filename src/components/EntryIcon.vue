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
  props.size === 'md' ? 'h-12 w-12 rounded-[24%] text-lg' : 'h-9 w-9 rounded-[24%] text-sm',
)
// A letter on a fully saturated tile is loud in a long list, so entries without an icon get the same
// hue as a soft tint. Full class names are spelled out so Tailwind can see them
const LETTER_TINTS: Record<string, string> = {
  'bg-red-600': 'bg-red-500/15 text-red-600 dark:text-red-400',
  'bg-orange-500': 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  'bg-amber-400': 'bg-amber-400/15 text-amber-600 dark:text-amber-300',
  'bg-emerald-600': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  'bg-blue-500': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'bg-cyan-500': 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  'bg-violet-500': 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  'bg-pink-500': 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  'bg-gray-500': 'bg-gray-500/15 text-gray-600 dark:text-gray-300',
  'bg-gray-700': 'bg-gray-900/[0.07] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300',
}
const letterTile = computed(
  () =>
    LETTER_TINTS[props.color] ??
    'bg-gray-900/[0.07] text-gray-600 dark:bg-white/[0.08] dark:text-gray-300',
)

// "Revolut Card" -> "RC", "github" -> "G". Leading symbols and a leading "The" carry no identity
const initials = computed(() => {
  const words = props.name
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .split(/[\s._-]+/)
    .filter((w) => w && !/^the$/i.test(w))
  const first = words[0]?.charAt(0)
  if (!first) return props.name.charAt(0).toUpperCase() || '?'
  const second = words.length > 1 ? words[1]!.charAt(0) : ''
  return (first + second).toUpperCase()
})

const glyph = computed(() => (props.size === 'md' ? 'h-6 w-6' : 'h-5 w-5'))
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center font-semibold"
    :class="[
      box,
      resolved
        ? `${color} text-white shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.12)]`
        : `${letterTile} ${initials.length > 1 ? 'tracking-tight' : ''}`,
    ]"
  >
    <IconGlyph v-if="resolved" :icon="resolved" :class="glyph" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

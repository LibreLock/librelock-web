<script setup lang="ts">
import { computed } from 'vue'
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { useThemeStore } from '@/stores/theme'

const props = defineProps<{
  /** With a label it renders as a full-width menu row (the mobile More sheet). */
  label?: string
}>()

const theme = useThemeStore()
const dark = computed(() => theme.theme === 'dark')

// Cross-fade the whole page instead of snapping between light and dark, so there is no abrupt
// brightness jump. Skipped under reduced motion and in browsers without view transitions
function toggle() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduce) {
    theme.toggle()
    return
  }
  document.startViewTransition(() => theme.toggle())
}

// The glyph that is not showing sits rotated and shrunk, so a switch reads as one icon turning
// into the other
const GLYPH =
  'absolute inset-0 transition-[opacity,rotate,scale] duration-500 ease-[var(--ease-out)] motion-reduce:transition-opacity'
</script>

<template>
  <button
    type="button"
    class="cursor-pointer rounded-lg transition-colors duration-150"
    :class="
      props.label
        ? 'flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 active:bg-gray-100 dark:text-gray-400 dark:active:bg-white/[0.06]'
        : 'flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-900/[0.05] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-100'
    "
    :title="`${dark ? 'Dark' : 'Light'} theme`"
    :aria-label="`Switch to ${dark ? 'light' : 'dark'} theme`"
    @click="toggle"
  >
    <span
      class="relative block shrink-0"
      :class="props.label ? 'size-5' : 'size-[18px]'"
      aria-hidden="true"
    >
      <PhSun
        :size="props.label ? 20 : 18"
        :class="[GLYPH, dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100']"
      />
      <PhMoon
        :size="props.label ? 20 : 18"
        :class="[GLYPH, dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0']"
      />
    </span>
    <template v-if="props.label">
      {{ props.label }}
      <span class="ml-auto text-gray-400 dark:text-gray-500">{{ dark ? 'Dark' : 'Light' }}</span>
    </template>
  </button>
</template>

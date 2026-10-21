<script setup lang="ts">
import { PhLock } from '@phosphor-icons/vue'

type IconSize = 'sm' | 'md' | 'lg'

const props = defineProps<{
  size: IconSize
}>()

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-15 w-15',
}

// Half the tile, matching the static icons
const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-[30px] w-[30px]',
}
</script>

<template>
  <div
    :class="sizeClasses[props.size] || sizeClasses.md"
    class="flex shrink-0 items-center justify-center rounded-[28%] bg-linear-to-b from-gray-600 to-gray-900 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_-1px_0_rgb(0_0_0/0.2),0_1px_2px_rgb(17_17_19/0.25),0_4px_12px_-4px_rgb(17_17_19/0.35)] dark:from-gray-500 dark:to-gray-800 dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_0_0_0.5px_rgb(255_255_255/0.1),0_4px_14px_-4px_rgb(0_0_0/0.6)]"
  >
    <!-- Same glyph and proportions as public/logo.svg (scripts/generate-icons.ts) -->
    <PhLock class="translate-y-[1.5%]" :class="iconSizeClasses[props.size] || iconSizeClasses.md" />
  </div>
</template>

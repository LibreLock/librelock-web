<script setup lang="ts">
import type { Component } from 'vue'
import { PhCheckCircle, PhInfo, PhWarningCircle } from '@phosphor-icons/vue'
import { useToast, type ToastVariant } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

// One themed surface for every toast, the same card surface as the rest of the app; the variant only picks and tints the glyph
const GLYPHS: Record<ToastVariant, { icon: Component; tint: string }> = {
  success: { icon: PhCheckCircle, tint: 'text-emerald-500 dark:text-emerald-400' },
  error: { icon: PhWarningCircle, tint: 'text-red-500 dark:text-red-400' },
  info: { icon: PhInfo, tint: 'text-gray-400 dark:text-gray-400' },
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup name="toast">
        <button
          v-for="t in toasts"
          :key="t.id"
          type="button"
          class="pointer-events-auto flex max-w-[min(28rem,calc(100vw-2rem))] cursor-pointer items-center gap-2 rounded-xl bg-white/95 py-2.5 pl-3 pr-4 text-sm font-medium text-gray-800 shadow-lg shadow-gray-900/10 ring-1 ring-gray-900/[0.08] backdrop-blur-xl dark:bg-gray-800/95 dark:text-gray-100 dark:shadow-black/40 dark:ring-white/[0.1]"
          @click="dismiss(t.id)"
        >
          <component
            :is="GLYPHS[t.variant].icon"
            :size="18"
            weight="fill"
            class="shrink-0"
            :class="GLYPHS[t.variant].tint"
            aria-hidden="true"
          />
          <span class="text-left">{{ t.message }}</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
/* Materialize rather than fade: the HUD rises from the edge it lives on, scaling and sharpening
   together, and leaves the same way it came */
.toast-enter-active {
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.42s cubic-bezier(0.34, 1.3, 0.64, 1),
    filter 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-leave-active {
  transition:
    opacity 0.2s ease-in,
    transform 0.2s ease-in,
    filter 0.2s ease-in;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.94);
  filter: blur(4px);
}
.toast-move {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: opacity 0.2s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
    filter: none;
  }
}
</style>

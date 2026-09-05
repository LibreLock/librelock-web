<script setup lang="ts">
import { useToast, type ToastVariant } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const STYLES: Record<ToastVariant, string> = {
  success:
    'border-emerald-200 dark:border-emerald-900 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300',
  error:
    'border-red-200 dark:border-red-900 bg-white dark:bg-gray-800 text-red-700 dark:text-red-300',
  info: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200',
}

const DOTS: Record<ToastVariant, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  info: 'bg-gray-400',
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-6"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup name="toast">
        <button
          v-for="t in toasts"
          :key="t.id"
          type="button"
          class="pointer-events-auto flex max-w-[min(28rem,calc(100vw-2rem))] cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-lg transition-colors"
          :class="STYLES[t.variant]"
          @click="dismiss(t.id)"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="DOTS[t.variant]"></span>
          <span class="text-left">{{ t.message }}</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
.toast-move {
  transition: transform 0.18s ease;
}
</style>

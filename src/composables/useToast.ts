import { readonly, ref } from 'vue'

// App-wide toast queue.
//
// Module-level state rather than a Pinia store: toasts are fired from plain modules and stores
// (the vault store's copy actions), which have no component instance to resolve a store from, and
// there is nothing here worth persisting or devtool-inspecting.

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

export interface ToastOptions {
  variant?: ToastVariant
  /** Milliseconds before auto-dismiss; 0 keeps it until dismissed. */
  duration?: number
}

const DEFAULT_DURATION = 2600
const MAX_VISIBLE = 3

const items = ref<Toast[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 1

export function dismissToast(id: number): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  items.value = items.value.filter((t) => t.id !== id)
}

export function showToast(message: string, options: ToastOptions = {}): number {
  const { variant = 'info', duration = DEFAULT_DURATION } = options

  // Repeating the same shortcut re-arms the existing toast instead of stacking duplicates
  const existing = items.value.find((t) => t.message === message && t.variant === variant)
  if (existing) {
    dismissToast(existing.id)
  }

  const toast: Toast = { id: nextId++, message, variant }
  const next = [...items.value, toast]
  // Oldest ones fall off the stack; drop their pending timers with them
  for (const dropped of next.slice(0, Math.max(0, next.length - MAX_VISIBLE))) {
    const timer = timers.get(dropped.id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(dropped.id)
    }
  }
  items.value = next.slice(-MAX_VISIBLE)

  if (duration > 0) {
    timers.set(
      toast.id,
      setTimeout(() => dismissToast(toast.id), duration),
    )
  }
  return toast.id
}

export const toast = {
  show: showToast,
  success: (message: string, options: ToastOptions = {}) =>
    showToast(message, { ...options, variant: 'success' }),
  error: (message: string, options: ToastOptions = {}) =>
    showToast(message, { ...options, variant: 'error' }),
  info: (message: string, options: ToastOptions = {}) =>
    showToast(message, { ...options, variant: 'info' }),
  dismiss: dismissToast,
}

export function useToast() {
  return { toasts: readonly(items), ...toast }
}

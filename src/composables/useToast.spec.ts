import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, showToast, useToast } from '@/composables/useToast'

const { toasts } = useToast()

// dismissToast replaces the array rather than mutating it, so iterating the current one is safe
function clearAll() {
  for (const t of toasts.value) dismissToast(t.id)
}

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearAll()
  })

  afterEach(() => {
    clearAll()
    vi.useRealTimers()
  })

  it('auto-dismisses after the duration', () => {
    showToast('Password copied', { variant: 'success', duration: 1000 })
    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(999)
    expect(toasts.value).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('re-arms an identical toast instead of stacking duplicates', () => {
    showToast('Nothing to copy', { duration: 1000 })
    vi.advanceTimersByTime(800)
    showToast('Nothing to copy', { duration: 1000 })

    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(800)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(toasts.value).toHaveLength(0)
  })

  it('keeps only the most recent toasts', () => {
    for (const message of ['one', 'two', 'three', 'four']) showToast(message, { duration: 0 })

    expect(toasts.value.map((t) => t.message)).toEqual(['two', 'three', 'four'])
  })
})

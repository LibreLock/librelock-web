import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listener: null as ((value: string) => void) | null,
  request: vi.fn(),
}))

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>()
  return {
    ...actual,
    apiRequest: api.request,
    setSessionExpiryListener: (fn: (value: string) => void) => (api.listener = fn),
  }
})

const { ApiError, NetworkError } = await import('@/services/api')
const { clearSessionExpiry, startSessionWatch } = await import('@/services/sessionWatch')

const onExpired = vi.fn()
startSessionWatch(onExpired)

function deadlineIn(ms: number) {
  api.listener?.(new Date(Date.now() + ms).toISOString())
}

describe('sessionWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    api.request.mockReset()
    onExpired.mockReset()
  })

  afterEach(() => {
    clearSessionExpiry()
    vi.useRealTimers()
  })

  it('signs out once the deadline passes and the server confirms with a 401', async () => {
    api.request.mockRejectedValue(new ApiError('Session expired', 401, null))
    deadlineIn(60_000)

    await vi.advanceTimersByTimeAsync(59_000)
    expect(api.request).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(3_000)
    expect(api.request).toHaveBeenCalledOnce()
    expect(onExpired).toHaveBeenCalledOnce()
  })

  it('re-arms instead of signing out when another tab kept the session alive', async () => {
    api.request.mockImplementation(async () => deadlineIn(60_000))
    deadlineIn(1_000)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(api.request).toHaveBeenCalledOnce()
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('keeps the user signed in while the server is unreachable', async () => {
    api.request.mockRejectedValue(new NetworkError())
    deadlineIn(1_000)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(onExpired).not.toHaveBeenCalled()
  })

  it('does nothing after logout cleared the deadline', async () => {
    deadlineIn(1_000)
    clearSessionExpiry()

    await vi.advanceTimersByTimeAsync(5_000)
    expect(api.request).not.toHaveBeenCalled()
  })
})

import { ApiError, apiRequest, NetworkError, setSessionExpiryListener } from '@/services/api'

// The server slides a session's expiry on every authenticated request and reports the new deadline
// in X-Session-Expires. Moving around the app never touches the server (the vault lives decrypted
// in memory), so without this an idle tab only finds out its session is gone on the next save.
// Instead: arm a timer for the deadline, and when it passes ask the server once. A 401 means the
// session really lapsed; a fresh deadline means another tab kept it alive and the timer re-arms.

const RETRY_MS = 30_000
// setTimeout overflows past ~24.8 days
const MAX_DELAY_MS = 2 ** 31 - 1

let expiresAt: number | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let onExpired: (() => void) | null = null
let checking = false

function schedule(delay = expiresAt === null ? null : expiresAt - Date.now() + 1000) {
  clearTimeout(timer)
  if (delay === null) return
  timer = setTimeout(check, Math.min(Math.max(delay, 0), MAX_DELAY_MS))
}

async function check() {
  if (expiresAt === null || checking) return
  // Woken early (focus, a timer that fired before a later deadline arrived): nothing to do yet
  if (Date.now() < expiresAt) return schedule()

  checking = true
  try {
    // Answers with a new X-Session-Expires when the session is still valid, which re-arms us
    await apiRequest('/auth/me', { timeoutMs: 10000 })
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) {
      clearSessionExpiry()
      onExpired?.()
    } else if (caught instanceof NetworkError) {
      // No server, no verdict: try again later rather than signing out an offline user
      schedule(RETRY_MS)
    }
  } finally {
    checking = false
  }
}

// A sleeping laptop or a throttled background tab can sail past the deadline without the timer
// firing on time, so look again whenever the tab comes back
function onReturn() {
  if (document.visibilityState === 'visible' && expiresAt !== null && Date.now() >= expiresAt) {
    check()
  }
}

export function startSessionWatch(handler: () => void) {
  onExpired = handler
  setSessionExpiryListener((value) => {
    const parsed = Date.parse(value)
    if (Number.isNaN(parsed)) return
    expiresAt = parsed
    schedule()
  })
  document.addEventListener('visibilitychange', onReturn)
  window.addEventListener('focus', onReturn)
}

export function clearSessionExpiry() {
  expiresAt = null
  clearTimeout(timer)
}

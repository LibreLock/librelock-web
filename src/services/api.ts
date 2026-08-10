import { API_BASE_URL } from '@/constants'
import { markServerReachable, markServerUnreachable } from '@/services/connectivity'

// Without one, a request to a host that drops packets (VPN down) never settles and every caller
// awaiting it hangs forever - the router guard included, which is what leaves a blank page
const DEFAULT_TIMEOUT_MS = 30000

let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

export interface ApiRequestInit extends RequestInit {
  timeoutMs?: number
}

// The request never reached a server, so there is no status and no payload to report: DNS failure,
// refused connection, a VPN that is not up, or a timeout waiting on a host that swallows packets
export class NetworkError extends Error {
  constructor(
    message = 'Cannot reach the server. Check your connection - if this instance is behind a VPN, make sure it is connected.',
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ApiError extends Error {
  public readonly status: number

  public readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function buildApiUrl(path: string) {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${normalizedPath}`
}

function extractMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const { message, error, errors } = payload as {
      message?: unknown
      error?: unknown
      errors?: unknown
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }

    if (typeof error === 'string' && error.trim()) {
      return error
    }

    if (errors && typeof errors === 'object') {
      const messages = Object.values(errors as Record<string, unknown>)
        .flat()
        .filter((m): m is string => typeof m === 'string' && m.trim() !== '')

      if (messages.length) {
        return messages.join(' ')
      }
    }
  }

  return fallback
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init
  const timeout = AbortSignal.timeout(timeoutMs)

  let response: Response
  try {
    response = await fetch(buildApiUrl(path), {
      credentials: 'include',
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
  } catch (caught) {
    // A caller that aborted on purpose gets its own error back; that is not a connectivity problem
    if (signal?.aborted) throw caught
    markServerUnreachable()
    throw new NetworkError()
  }

  markServerReachable()

  const rawBody = await response.text()
  let payload: T | undefined

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as T
    } catch {
      payload = rawBody as T
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      unauthorizedHandler?.()
    }
    throw new ApiError(extractMessage(payload, response.statusText), response.status, payload)
  }

  return payload
}

import { API_BASE_URL } from '@/constants'

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
    const { message, error } = payload as { message?: unknown; error?: unknown }

    if (typeof message === 'string' && message.trim()) {
      return message
    }

    if (typeof error === 'string' && error.trim()) {
      return error
    }
  }

  return fallback
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    ...init,
  })

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
    throw new ApiError(extractMessage(payload, response.statusText), response.status, payload)
  }

  return payload
}

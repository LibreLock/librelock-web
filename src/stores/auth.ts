import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, apiRequest } from '@/services/api'

export interface AuthUser {
  id?: string | number
  username: string
}

interface AuthPayload {
  username: string
  password: string
}

interface AuthResponse {
  user?: AuthUser
  message?: string
}

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong.'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const status = ref<SessionStatus>('idle')
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isSessionLoading = computed(() => status.value === 'loading')

  async function refreshSession() {
    if (status.value === 'loading') {
      return user.value
    }

    status.value = 'loading'

    try {
      const response = (await apiRequest<AuthResponse>('/auth/me')) ?? {}
      user.value = response.user ?? null
      status.value = user.value ? 'authenticated' : 'anonymous'
      return user.value
    } catch (error) {
      user.value = null
      status.value = 'anonymous'

      if (error instanceof ApiError) {
        return null
      }

      return null
    }
  }

  async function signIn(payload: AuthPayload) {
    isSubmitting.value = true
    error.value = null

    try {
      const response =
        (await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        })) ?? {}

      if (response.user) {
        user.value = response.user
        status.value = 'authenticated'
        return response.user
      }

      return await refreshSession()
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError)
      throw caughtError
    } finally {
      isSubmitting.value = false
    }
  }

  async function signUp(payload: AuthPayload) {
    isSubmitting.value = true
    error.value = null

    try {
      const response =
        (await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        })) ?? {}

      if (response.user) {
        user.value = response.user
        status.value = 'authenticated'
        return response.user
      }

      return await refreshSession()
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError)
      throw caughtError
    } finally {
      isSubmitting.value = false
    }
  }

  async function signOut() {
    isSubmitting.value = true

    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      })
    } finally {
      user.value = null
      status.value = 'anonymous'
      isSubmitting.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    clearError,
    error,
    isAuthenticated,
    isSessionLoading,
    isSubmitting,
    refreshSession,
    signIn,
    signOut,
    signUp,
    status,
    user,
  }
})

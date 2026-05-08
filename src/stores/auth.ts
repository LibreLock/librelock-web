import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, apiRequest } from '@/services/api'
import { deriveKeys, encryptField, generateKdfSalt, type KdfParams } from '@/services/crypto'
import { clearSessionKey, loadSessionKey, saveSessionKey } from '@/services/keystore'
import { getMasterKey, setMasterKey } from '@/services/keyring'
import { useCategoriesStore } from '@/stores/categories'
import { useVaultStore } from '@/stores/vault'

export { getMasterKey }

export interface AuthUser {
  id?: string | number
  username: string
}

interface KdfResponse {
  kdf_algo?: string
  kdf_salt: string
  kdf_iter: number
  kdf_memory: number
  kdf_parallelism: number
}

interface AuthResponse {
  user?: AuthUser
  message?: string
}

type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

const DEFAULT_CATEGORIES = ['Personal', 'Work', 'Finance', 'Social', 'Development']

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

async function fetchKdfParams(username: string): Promise<KdfParams> {
  const data = await apiRequest<KdfResponse>(`/auth/kdf?username=${encodeURIComponent(username)}`)
  if (!data) throw new Error('No KDF params returned.')
  return {
    kdf_salt: data.kdf_salt,
    kdf_iter: data.kdf_iter,
    kdf_memory: data.kdf_memory,
    kdf_parallelism: data.kdf_parallelism,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const status = ref<SessionStatus>('idle')
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isSessionLoading = computed(() => status.value === 'loading')

  async function refreshSession() {
    if (status.value === 'loading') return user.value

    status.value = 'loading'
    try {
      const response = (await apiRequest<AuthResponse>('/auth/me')) ?? {}
      user.value = response.user ?? null
      status.value = user.value ? 'authenticated' : 'anonymous'

      // Restore MasterKey from IndexedDB if JWT cookie is still valid
      if (user.value && !getMasterKey()) {
        const key = await loadSessionKey()
        setMasterKey(key)
        if (!getMasterKey()) {
          await signOut()
          return null
        }
      }

      return user.value
    } catch {
      user.value = null
      status.value = 'anonymous'
      return null
    }
  }

  async function signIn(username: string, password: string) {
    isSubmitting.value = true
    error.value = null

    try {
      const kdfParams = await fetchKdfParams(username)
      const { masterKey, authCredential } = await deriveKeys(password, kdfParams)

      const response =
        (await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, auth_credential: authCredential }),
        })) ?? {}

      setMasterKey(masterKey)
      await saveSessionKey(masterKey)
      user.value = response.user ?? null
      status.value = 'authenticated'
      return user.value
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError)
      throw caughtError
    } finally {
      isSubmitting.value = false
    }
  }

  async function signUp(username: string, password: string) {
    isSubmitting.value = true
    error.value = null

    try {
      const kdf_salt = generateKdfSalt()
      const kdfParams: KdfParams = {
        kdf_salt,
        kdf_iter: 3,
        kdf_memory: 65536,
        kdf_parallelism: 4,
      }
      const { masterKey, authCredential } = await deriveKeys(password, kdfParams)

      const categories = await Promise.all(
        DEFAULT_CATEGORIES.map(async (name) => ({ name: await encryptField(name, masterKey) })),
      )

      const response =
        (await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username,
            auth_credential: authCredential,
            kdf_salt,
            kdf_iter: kdfParams.kdf_iter,
            kdf_memory: kdfParams.kdf_memory,
            kdf_parallelism: kdfParams.kdf_parallelism,
            categories,
          }),
        })) ?? {}

      setMasterKey(masterKey)
      await saveSessionKey(masterKey)
      user.value = response.user ?? null
      status.value = 'authenticated'
      return user.value
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
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      setMasterKey(null)
      await clearSessionKey()
      useCategoriesStore().clear()
      useVaultStore().clear()
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

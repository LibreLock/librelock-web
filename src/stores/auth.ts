import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, apiRequest } from '@/services/api'
import {
  deriveKeys,
  encryptString,
  generateKdfSalt,
  generateVaultKey,
  wrapKey,
  unwrapKey,
  type KdfParams,
} from '@/services/crypto'
import { clearSessionKey, loadSessionKey, saveSessionKey } from '@/services/keystore'
import { getMasterKey, setMasterKey } from '@/services/keyring'
import { useCategoriesStore } from '@/stores/categories'
import { useVaultStore } from '@/stores/vault'
import { DEFAULT_CATEGORIES, KDF_ITER, KDF_MEMORY, KDF_PARALLELISM } from '@/constants'

export { getMasterKey }

export interface AuthUser {
  id?: string | number
  username: string
  protected_key?: string
}

export interface KdfResponse {
  kdf_algo: string
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export async function fetchKdfParams(username: string): Promise<KdfParams> {
  const data = await apiRequest<KdfResponse>(`/auth/kdf?username=${encodeURIComponent(username)}`)
  if (!data) throw new Error('No KDF params returned.')
  return {
    kdfSalt: data.kdf_salt,
    kdfIter: data.kdf_iter,
    kdfMemory: data.kdf_memory,
    kdfParallelism: data.kdf_parallelism,
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
          await logOut()
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

  async function logIn(username: string, password: string) {
    isSubmitting.value = true
    error.value = null

    try {
      const kdfParams = await fetchKdfParams(username)
      const { wrappingKey, authCredential } = await deriveKeys(password, kdfParams)

      const response =
        (await apiRequest<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, auth_credential: authCredential }),
        })) ?? {}

      const protectedKey = response.user?.protected_key
      if (!protectedKey) throw new Error('Server did not return protected_key.')
      const vaultKey = await unwrapKey(protectedKey, wrappingKey)

      setMasterKey(vaultKey)
      await saveSessionKey(vaultKey)
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

  async function register(username: string, password: string) {
    isSubmitting.value = true
    error.value = null

    try {
      const kdfSalt = generateKdfSalt()
      const kdfParams: KdfParams = {
        kdfSalt: kdfSalt,
        kdfIter: KDF_ITER,
        kdfMemory: KDF_MEMORY,
        kdfParallelism: KDF_PARALLELISM,
      }
      const { wrappingKey, authCredential } = await deriveKeys(password, kdfParams)
      const vaultKey = await generateVaultKey()
      const protected_key = await wrapKey(vaultKey, wrappingKey)

      const categories = await Promise.all(
        DEFAULT_CATEGORIES.map(async (name) => ({ name: await encryptString(name, vaultKey) })),
      )

      const response =
        (await apiRequest<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username,
            auth_credential: authCredential,
            protected_key,
            kdf_salt: kdfSalt,
            kdf_iter: kdfParams.kdfIter,
            kdf_memory: kdfParams.kdfMemory,
            kdf_parallelism: kdfParams.kdfParallelism,
            categories,
          }),
        })) ?? {}

      setMasterKey(vaultKey)
      await saveSessionKey(vaultKey)
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

  async function logOut() {
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
    logIn,
    logOut,
    register,
    status,
    user,
  }
})

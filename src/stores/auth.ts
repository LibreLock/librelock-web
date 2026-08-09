import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { ApiError, apiRequest } from '@/services/api'
import {
  deriveKeys,
  encryptString,
  generateKdfSalt,
  generateVaultKey,
  generateUserKeypair,
  exportPublicKey,
  wrapPrivateKey,
  unwrapPrivateKey,
  unwrapKeyWithPrivate,
  wrapKey,
  unwrapKey,
  type KdfParams,
} from '@/services/crypto'
import {
  clearSessionKey,
  loadSessionKey,
  saveSessionKey,
  savePrivateKey,
  loadPrivateKey,
  saveOrgKey,
  loadOrgKey as loadStoredOrgKey,
} from '@/services/keystore'
import {
  getVaultKey,
  setVaultKey,
  getPrivateKey,
  setPrivateKey,
  getOrgKey,
  setOrgKey,
} from '@/services/keyring'
import {
  broadcastAuth,
  broadcastLogout,
  requestKeyFromTabs,
  type TabSyncUser,
  type TabSyncKeys,
} from '@/services/tabsync'
import { useCategoriesStore } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'
import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'
import { useThemeStore } from '@/stores/theme'
import {
  DEFAULT_CATEGORIES,
  KDF_ALGO,
  KDF_ITER,
  KDF_MEMORY,
  KDF_PARALLELISM,
  KDF_SALT_HEX_LENGTH,
} from '@/constants'

export { getVaultKey }

export interface AuthUser {
  id?: string | number
  username: string
  protected_key?: string
  public_key?: string
  encrypted_private_key?: string
  role?: string
  theme?: string
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

// Unwraps the user's sharing private key with the password key
// For accounts created before the feature, generates one now and backfills it server-side (idempotent: the server only accepts it if no public key is set yet)
async function restoreOrBackfillKeypair(user: AuthUser, wrappingKey: CryptoKey): Promise<void> {
  try {
    let priv: CryptoKey
    if (user.encrypted_private_key) {
      priv = await unwrapPrivateKey(user.encrypted_private_key, wrappingKey)
    } else {
      const keypair = await generateUserKeypair()
      const public_key = await exportPublicKey(keypair.publicKey)
      const encrypted_private_key = await wrapPrivateKey(keypair.privateKey, wrappingKey)
      await apiRequest('/settings/keypair', {
        method: 'PUT',
        body: JSON.stringify({ public_key, encrypted_private_key }),
      })
      priv = keypair.privateKey
      user.public_key = public_key
      user.encrypted_private_key = encrypted_private_key
    }
    setPrivateKey(priv)
    await savePrivateKey(priv)
  } catch {
    // Sharing is optional; a keypair failure must not block login
    setPrivateKey(null)
  }
}

// Fetches the caller's wrapped org key and unwraps it with their private key
// A 404 (no membership) or any failure just leaves the org key unset
export async function loadOrgKeyFromServer(): Promise<void> {
  const priv = getPrivateKey()
  if (!priv) return
  try {
    const data = await apiRequest<{ wrapped_key?: string }>('/org/shared-key')
    if (!data?.wrapped_key) {
      setOrgKey(null)
      return
    }
    const orgKey = await unwrapKeyWithPrivate(data.wrapped_key, priv)
    setOrgKey(orgKey)
    await saveOrgKey(orgKey)
  } catch {
    setOrgKey(null)
  }
}

// The server is not trusted to pick these
//
// It returns the parameters the client derives its auth credential under, so a hostile one could answer with iter: 1 / memory: 8192 and collect a credential cheap to crack offline
// Unknown usernames get plausible parameters, so this never fires as a side effect of a typo
function assertKdfFloor(data: KdfResponse): void {
  const salt = data.kdf_salt ?? ''
  const safe =
    data.kdf_algo === KDF_ALGO &&
    /^[0-9a-f]+$/i.test(salt) &&
    salt.length >= KDF_SALT_HEX_LENGTH &&
    data.kdf_iter >= KDF_ITER &&
    data.kdf_memory >= KDF_MEMORY &&
    data.kdf_parallelism >= 1
  if (!safe) {
    throw new Error(
      'The server returned unsafe key-derivation settings. Sign-in was stopped to protect your master password.',
    )
  }
}

export async function fetchKdfParams(username: string): Promise<KdfParams> {
  const data = await apiRequest<KdfResponse>(`/auth/kdf?username=${encodeURIComponent(username)}`)
  if (!data) throw new Error('No KDF params returned.')
  assertKdfFloor(data)
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
  // Set when a 401 bounces the user to /login
  // In-memory only, so a manual page refresh clears it and the banner disappears
  const sessionExpired = ref(false)

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isSessionLoading = computed(() => status.value === 'loading')
  const isOwner = computed(() => user.value?.role === 'owner')
  // Owner is a superset of admin; it unlocks the same admin UI, plus more
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'owner')

  async function refreshSession() {
    if (status.value === 'loading') return user.value

    status.value = 'loading'
    try {
      const response = (await apiRequest<AuthResponse>('/auth/me')) ?? {}
      if (status.value !== 'loading') return user.value
      user.value = response.user ?? null
      status.value = user.value ? 'authenticated' : 'anonymous'
      if (user.value) useThemeStore().adopt(user.value.theme)

      // Restore vault key from IndexedDB if session cookie is still valid
      // If no key is found (new tab, or the session secret is gone), ask other tabs before giving up
      if (user.value && !getVaultKey()) {
        const key = await loadSessionKey()
        setVaultKey(key)
        if (getVaultKey()) {
          // Same tab, still-valid session: restore the sharing keys too
          setPrivateKey(await loadPrivateKey())
          setOrgKey(await loadStoredOrgKey())
        } else {
          // Quick ask first, so a tab that will never answer doesn't hold up the login screen
          // Then, only on the path that would end the session for the whole browser, a longer one: a backgrounded tab holding the keys can be slow, and killing its session would be worse than the second of delay paid on the way to login
          const synced = (await requestKeyFromTabs()) ?? (await requestKeyFromTabs(2000))
          if (synced) {
            await receiveTabAuth(synced, synced.user)
            return user.value
          }
          // The cookie outlived every key: the tab that opened this session is gone and no other tab answered, so nothing in this browser can decrypt anything with it
          // End it server-side too, or it lingers in the user's session list until TTL and the next sign-in shows two
          // No broadcast: any tab that could have claimed it would have answered the key request
          await logOut(false)
          return null
        }
      }

      return user.value
    } catch {
      if (status.value === 'loading') {
        user.value = null
        status.value = 'anonymous'
      }
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

      setVaultKey(vaultKey)
      await saveSessionKey(vaultKey)
      if (response.user) {
        await restoreOrBackfillKeypair(response.user, wrappingKey)
        await loadOrgKeyFromServer()
      }
      user.value = response.user ?? null
      status.value = 'authenticated'
      if (user.value) useThemeStore().adopt(user.value.theme)
      broadcastAuth(
        { key: vaultKey, privateKey: getPrivateKey(), orgKey: getOrgKey() },
        user.value!,
      )
      return user.value
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError)
      throw caughtError
    } finally {
      isSubmitting.value = false
    }
  }

  async function register(username: string, password: string, inviteToken?: string) {
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

      const keypair = await generateUserKeypair()
      const public_key = await exportPublicKey(keypair.publicKey)
      const encrypted_private_key = await wrapPrivateKey(keypair.privateKey, wrappingKey)

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
            invite_token: inviteToken,
            theme: useThemeStore().theme,
            public_key,
            encrypted_private_key,
          }),
        })) ?? {}

      setVaultKey(vaultKey)
      setPrivateKey(keypair.privateKey)
      await saveSessionKey(vaultKey)
      await savePrivateKey(keypair.privateKey)
      user.value = response.user ?? null
      status.value = 'authenticated'
      if (user.value) useThemeStore().adopt(user.value.theme)
      return user.value
    } catch (caughtError) {
      error.value = getErrorMessage(caughtError)
      throw caughtError
    } finally {
      isSubmitting.value = false
    }
  }

  async function logOut(broadcast = true) {
    if (broadcast) broadcastLogout()
    isSubmitting.value = true
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // in case server session is gone (account deleted)
    } finally {
      setVaultKey(null)
      setPrivateKey(null)
      setOrgKey(null)
      await clearSessionKey()
      useCategoriesStore().clear()
      useOrgCategoriesStore().clear()
      useVaultStore().clear()
      useOrgVaultStore().clear()
      user.value = null
      status.value = 'anonymous'
      isSubmitting.value = false
    }
  }

  async function receiveTabAuth(keys: TabSyncKeys, syncedUser: TabSyncUser) {
    setVaultKey(keys.key)
    setPrivateKey(keys.privateKey ?? null)
    setOrgKey(keys.orgKey ?? null)
    await saveSessionKey(keys.key)
    if (keys.privateKey) await savePrivateKey(keys.privateKey)
    if (keys.orgKey) await saveOrgKey(keys.orgKey)
    user.value = syncedUser as AuthUser
    status.value = 'authenticated'
  }

  function clearError() {
    error.value = null
  }

  return {
    clearError,
    error,
    sessionExpired,
    isAuthenticated,
    isSessionLoading,
    isAdmin,
    isOwner,
    isSubmitting,
    refreshSession,
    logIn,
    logOut,
    receiveTabAuth,
    register,
    status,
    user,
  }
})

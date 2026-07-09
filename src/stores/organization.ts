import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import { API_BASE_URL, APP_NAME } from '@/constants'

export type AppMode = 'personal' | 'organization'
export type RegistrationPolicy = 'open' | 'invite'

export interface Organization {
  name: string
  support_email: string
  support_url: string
  login_message: string
  has_logo: boolean
  logo_updated_at: string
  mode: AppMode
  registration: RegistrationPolicy
}

interface OrganizationResponse {
  organization: Organization
}

export const useOrganizationStore = defineStore('organization', () => {
  const org = ref<Organization | null>(null)
  const loaded = ref(false)

  // Falls back to the built-in LibreLock brand until/if a custom one is set.
  const name = computed(() => org.value?.name?.trim() || APP_NAME)
  const hasLogo = computed(() => org.value?.has_logo ?? false)
  const mode = computed<AppMode>(() => org.value?.mode ?? 'personal')
  const isOrganization = computed(() => mode.value === 'organization')
  const registration = computed<RegistrationPolicy>(() => org.value?.registration ?? 'open')
  const supportEmail = computed(() => org.value?.support_email?.trim() || '')
  const supportUrl = computed(() => org.value?.support_url?.trim() || '')
  const loginMessage = computed(() => org.value?.login_message?.trim() || '')

  // Cache-busted so a freshly uploaded logo shows immediately.
  const logoUrl = computed(() => {
    if (!org.value?.has_logo) return ''
    const stamp = encodeURIComponent(org.value.logo_updated_at ?? '')
    return `${API_BASE_URL.replace(/\/$/, '')}/organization/logo?v=${stamp}`
  })

  function apply(next: Organization) {
    // Never let a partial payload drop mode/registration (would hide the
    // Organization UI); fall back to the previous values, then defaults.
    const prev = org.value
    org.value = {
      ...next,
      mode: next.mode ?? prev?.mode ?? 'personal',
      registration: next.registration ?? prev?.registration ?? 'open',
    }
    loaded.value = true
    document.title = APP_NAME
  }

  async function load() {
    try {
      const data = await apiRequest<OrganizationResponse>('/organization')
      if (data?.organization) apply(data.organization)
    } catch {
      // Non-fatal: keep default LibreLock branding if the call fails.
    } finally {
      loaded.value = true
    }
  }

  async function switchToOrganization() {
    await apiRequest('/settings/mode', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'organization' }),
    })
    await load()
  }

  // Owner-only, destructive: the server deletes every other account and drops the org tables.
  async function revertToPersonal(authCredential: string) {
    await apiRequest('/settings/mode', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'personal', auth_credential: authCredential }),
    })
    await load()
  }

  // Admin-only: switch invite-only vs open public registration.
  async function setRegistration(policy: RegistrationPolicy) {
    const data = await apiRequest<OrganizationResponse>('/organization/registration', {
      method: 'PUT',
      body: JSON.stringify({ registration: policy }),
    })
    if (data?.organization) apply(data.organization)
  }

  return {
    org,
    loaded,
    name,
    hasLogo,
    mode,
    isOrganization,
    registration,
    supportEmail,
    supportUrl,
    loginMessage,
    logoUrl,
    apply,
    load,
    switchToOrganization,
    revertToPersonal,
    setRegistration,
  }
})

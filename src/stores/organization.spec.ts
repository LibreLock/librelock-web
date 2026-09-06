import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const requests: { path: string; body: unknown }[] = []

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api')
  return {
    ...actual,
    apiRequest: vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>(
      async (path, init) => {
        requests.push({ path, body: JSON.parse(String(init?.body ?? 'null')) })
        return { organization: { ...base, member_manage_shared: true } }
      },
    ),
  }
})

import { useOrganizationStore } from '@/stores/organization'

const base = {
  name: 'Acme',
  support_email: '',
  support_url: '',
  login_message: '',
  has_logo: false,
  logo_updated_at: '',
  mode: 'organization' as const,
  registration: 'invite' as const,
  auto_grant_shared: false,
  member_manage_shared: false,
  member_edit_shared: false,
}

beforeEach(() => {
  setActivePinia(createPinia())
  requests.length = 0
})

describe('shared-vault member permissions', () => {
  // The getters gate what the entry form offers, so an unloaded organization must not read as permissive
  it('denies both until the organization payload has landed', () => {
    const org = useOrganizationStore()
    expect(org.memberManageShared).toBe(false)
    expect(org.memberEditShared).toBe(false)
  })

  it('reads both from the payload', () => {
    const org = useOrganizationStore()
    org.apply({ ...base, member_manage_shared: true, member_edit_shared: true })
    expect(org.memberManageShared).toBe(true)
    expect(org.memberEditShared).toBe(true)
  })

  it('sends only the toggle that changed, so the other keeps its stored value', async () => {
    const org = useOrganizationStore()
    await org.setMemberManageShared(true)
    expect(requests).toEqual([
      { path: '/organization/shared-settings', body: { member_manage_shared: true } },
    ])
    expect(org.memberManageShared).toBe(true)
  })
})

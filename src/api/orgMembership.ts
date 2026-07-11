import { apiRequest } from '@/services/api'
import { generateVaultKey, importPublicKey, wrapKeyForPublic } from '@/services/crypto'
import { getOrgKey, setOrgKey } from '@/services/keyring'
import { saveOrgKey } from '@/services/keystore'

export interface OrgMember {
  user_id: string
  username: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'suspended'
  public_key: string
  has_access: boolean
}

export async function listMembers(): Promise<OrgMember[]> {
  const data = await apiRequest<{ members: OrgMember[] }>('/organization/memberships')
  return data?.members ?? []
}

// Envelopes the shared org key to a member's public key and stores it server-side
async function grant(userId: string, publicKeyB64: string, orgKey: CryptoKey): Promise<void> {
  const pub = await importPublicKey(publicKeyB64)
  const wrapped_key = await wrapKeyForPublic(orgKey, pub)
  await apiRequest('/organization/memberships', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, wrapped_key }),
  })
}

export async function grantAccess(userId: string, publicKeyB64: string): Promise<void> {
  const orgKey = getOrgKey()
  if (!orgKey) throw new Error('Shared key unavailable. Open the shared vault first.')
  await grant(userId, publicKeyB64, orgKey)
}

export async function revokeAccess(userId: string): Promise<void> {
  await apiRequest(`/organization/memberships/${userId}`, { method: 'DELETE' })
}

// Creates the shared org key on first use and self-grants it to the owner
// Idempotent server-side, but only called when no memberships exist yet
export async function bootstrapOrgKey(ownUserId: string, ownPublicKeyB64: string): Promise<void> {
  const orgKey = await generateVaultKey()
  await grant(ownUserId, ownPublicKeyB64, orgKey)
  setOrgKey(orgKey)
  await saveOrgKey(orgKey)
}

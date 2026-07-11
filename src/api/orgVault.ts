import { apiRequest } from '@/services/api'
import { getOrgKey } from '@/services/keyring'
import {
  decryptRawWith,
  encryptEntryBlob,
  type CreateEntryPayload,
  type RawVaultEntry,
  type UpdateEntryPayload,
  type VaultEntry,
} from '@/api/vault'

// Shared entries are encrypted with the org key
// Their category (if any) points at an org category and is sent as a plaintext id column, like the personal vault
function requireOrgKey(): CryptoKey {
  const key = getOrgKey()
  if (!key) throw new Error('Shared vault is locked. You may not have access.')
  return key
}

export async function getOrgVaultEntries(): Promise<VaultEntry[]> {
  const key = getOrgKey()
  if (!key) return []
  const response = await apiRequest<{ entries: RawVaultEntry[] }>('/org-vault')
  if (!response) return []
  return Promise.all(response.entries.map((raw) => decryptRawWith(raw, key, true)))
}

export async function createOrgVaultEntry(payload: CreateEntryPayload): Promise<VaultEntry> {
  const key = requireOrgKey()
  const { encrypted_blob, iv, serverType } = await encryptEntryBlob(payload, key)
  const response = await apiRequest<{ entry: RawVaultEntry }>('/org-vault', {
    method: 'POST',
    body: JSON.stringify({
      type: serverType,
      encrypted_blob,
      iv,
      category_id: payload.categoryId ?? null,
      version: 1,
    }),
  })
  if (!response) throw new Error('No response from server.')
  return decryptRawWith(response.entry, key, true)
}

export async function updateOrgVaultEntry(
  id: string,
  payload: UpdateEntryPayload,
): Promise<VaultEntry> {
  const key = requireOrgKey()
  const { encrypted_blob, iv } = await encryptEntryBlob(payload, key)
  const response = await apiRequest<{ entry: RawVaultEntry }>(`/org-vault/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ encrypted_blob, iv, category_id: payload.categoryId ?? null }),
  })
  if (!response) throw new Error('No response from server.')
  return decryptRawWith(response.entry, key, true)
}

export async function deleteOrgVaultEntry(id: string): Promise<void> {
  await apiRequest(`/org-vault/${id}`, { method: 'DELETE' })
}

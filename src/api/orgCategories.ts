import { apiRequest } from '@/services/api'
import { decryptString, encryptString } from '@/services/crypto'
import { getOrgKey } from '@/services/keyring'
import type { VaultCategory } from '@/api/categories'

// Shared categories: the name is encrypted with the org key, so every member with shared access can read it
// Only admins can create/update/delete (enforced server-side); the encrypt still needs the org key, which admins hold

interface RawOrgCategory {
  id: string
  name: string
  created_at: string
  updated_at: string
}

function requireOrgKey(): CryptoKey {
  const key = getOrgKey()
  if (!key) throw new Error('Shared vault is locked. You may not have access.')
  return key
}

export async function getOrgCategories(): Promise<VaultCategory[]> {
  const key = getOrgKey()
  if (!key) return []
  const response = await apiRequest<{ categories: RawOrgCategory[] }>('/org-categories')
  if (!response) return []
  return Promise.all(
    response.categories.map(async (c) => ({
      id: c.id,
      name: await decryptString(c.name, key),
    })),
  )
}

export async function createOrgCategory(name: string): Promise<VaultCategory> {
  const key = requireOrgKey()
  const encryptedName = await encryptString(name, key)
  const response = await apiRequest<{ category: RawOrgCategory }>('/org-categories', {
    method: 'POST',
    body: JSON.stringify({ name: encryptedName }),
  })
  if (!response) throw new Error('No response from server.')
  return { id: response.category.id, name }
}

export async function updateOrgCategory(id: string, name: string): Promise<VaultCategory> {
  const key = requireOrgKey()
  const encryptedName = await encryptString(name, key)
  const response = await apiRequest<{ category: RawOrgCategory }>(`/org-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: encryptedName }),
  })
  if (!response) throw new Error('No response from server.')
  return { id: response.category.id, name }
}

export async function deleteOrgCategory(id: string): Promise<void> {
  await apiRequest(`/org-categories/${id}`, { method: 'DELETE' })
}

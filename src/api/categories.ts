import { apiRequest } from '@/services/api'
import { decryptString, encryptString } from '@/services/crypto'
import { getMasterKey } from '@/services/keyring'

export interface VaultCategory {
  id: string
  name: string
}

interface RawCategory {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

function requireMasterKey(): CryptoKey {
  const key = getMasterKey()
  if (!key) throw new Error('Vault is locked - please log in again.')
  return key
}

export async function getCategories(): Promise<VaultCategory[]> {
  const response = await apiRequest<{ categories: RawCategory[] }>('/categories')
  if (!response) return []
  const masterKey = requireMasterKey()
  return Promise.all(
    response.categories.map(async (c) => ({
      id: c.id,
      name: await decryptString(c.name, masterKey),
    })),
  )
}

export async function createCategory(name: string): Promise<VaultCategory> {
  const masterKey = requireMasterKey()
  const encryptedName = await encryptString(name, masterKey)
  const response = await apiRequest<{ category: RawCategory }>('/categories', {
    method: 'POST',
    body: JSON.stringify({ name: encryptedName }),
  })
  if (!response) throw new Error('No response from server.')
  return { id: response.category.id, name }
}

export async function updateCategory(id: string, name: string): Promise<VaultCategory> {
  const masterKey = requireMasterKey()
  const encryptedName = await encryptString(name, masterKey)
  const response = await apiRequest<{ category: RawCategory }>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: encryptedName }),
  })
  if (!response) throw new Error('No response from server.')
  return { id: response.category.id, name }
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest(`/categories/${id}`, { method: 'DELETE' })
}

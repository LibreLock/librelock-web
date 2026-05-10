import { DEFAULT_COLOR } from '@/constants'
import { apiRequest } from '@/services/api'
import { encryptBlob, decryptBlob } from '@/services/crypto'
import { getMasterKey } from '@/services/keyring'

export interface VaultPassword {
  id: string
  type: 'password'
  name: string
  username: string
  email: string
  password: string
  url: string
  notes: string
  color: string
  categoryId: string | null
  passwordStrength: number
  reused: boolean
  breached: boolean
  createdAt: string
  updatedAt: string
}

export interface VaultNote {
  id: string
  type: 'note'
  name: string
  content: string
  color: string
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

export type VaultEntry = VaultPassword | VaultNote

export interface CreatePasswordPayload {
  type: 'password'
  name: string
  username: string
  email: string
  password: string
  url: string
  notes: string
  color?: string
  categoryId?: string | null
}

export interface CreateNotePayload {
  type: 'note'
  name: string
  content: string
  color?: string
  categoryId?: string | null
}

export type CreateEntryPayload = CreatePasswordPayload | CreateNotePayload
export type UpdateEntryPayload = CreatePasswordPayload | CreateNotePayload

interface RawVaultEntry {
  id: string
  type: 'password_entry' | 'note'
  category_id: string | null
  encrypted_blob: string
  iv: string
  version: number
  created_at: string
  updated_at: string
}

interface VaultBlobData {
  name: string
  username?: string
  email?: string
  password?: string
  url?: string
  notes?: string
  content?: string
  color: string
}

function requireMasterKey(): CryptoKey {
  const key = getMasterKey()
  if (!key) throw new Error('Vault is locked -  log in again.')
  return key
}

function rawToEntry(raw: RawVaultEntry, blob: VaultBlobData): VaultEntry {
  const base = {
    id: raw.id,
    categoryId: raw.category_id,
    color: blob.color ?? DEFAULT_COLOR,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }

  if (raw.type === 'note') {
    return { ...base, type: 'note', name: blob.name, content: blob.content ?? '' }
  }

  const password = blob.password ?? ''
  return {
    ...base,
    type: 'password',
    name: blob.name,
    username: blob.username ?? '',
    email: blob.email ?? '',
    password,
    url: blob.url ?? '',
    notes: blob.notes ?? '',
    passwordStrength: scorePassword(password),
    reused: false,
    breached: false,
  }
}

async function decryptRaw(raw: RawVaultEntry): Promise<VaultEntry> {
  const masterKey = requireMasterKey()
  const blob = (await decryptBlob(raw.encrypted_blob, raw.iv, masterKey)) as VaultBlobData
  return rawToEntry(raw, blob)
}

async function encryptPayload(payload: CreateEntryPayload): Promise<{
  encrypted_blob: string
  iv: string
  category_id: string | null | undefined
  serverType: 'password_entry' | 'note'
}> {
  const masterKey = requireMasterKey()
  const blobData: VaultBlobData =
    payload.type === 'password'
      ? {
          name: payload.name,
          username: payload.username,
          email: payload.email,
          password: payload.password,
          url: payload.url,
          notes: payload.notes,
          color: payload.color ?? DEFAULT_COLOR,
        }
      : {
          name: payload.name,
          content: payload.content,
          color: payload.color ?? DEFAULT_COLOR,
        }

  const { encrypted_blob, iv } = await encryptBlob(blobData, masterKey)
  return {
    encrypted_blob,
    iv,
    category_id: payload.categoryId,
    serverType: payload.type === 'password' ? 'password_entry' : 'note',
  }
}

function scorePassword(password: string): number {
  let score = 0
  if (password.length >= 8) score += 2
  if (password.length >= 12) score += 2
  if (password.length >= 16) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 2
  return Math.min(score, 10)
}

export async function getVaultEntries(): Promise<VaultEntry[]> {
  const response = await apiRequest<{ entries: RawVaultEntry[] }>('/vault')
  if (!response) return []
  return Promise.all(response.entries.map(decryptRaw))
}

export async function getVaultEntry(id: string): Promise<VaultEntry> {
  const response = await apiRequest<{ entry: RawVaultEntry }>(`/vault/${id}`)
  if (!response) throw new Error('No response from server.')
  return decryptRaw(response.entry)
}

export async function createVaultEntry(payload: CreateEntryPayload): Promise<VaultEntry> {
  const { encrypted_blob, iv, category_id, serverType } = await encryptPayload(payload)
  const response = await apiRequest<{ entry: RawVaultEntry }>('/vault', {
    method: 'POST',
    body: JSON.stringify({ type: serverType, encrypted_blob, iv, category_id, version: 1 }),
  })
  if (!response) throw new Error('No response from server.')
  return decryptRaw(response.entry)
}

export async function updateVaultEntry(
  id: string,
  payload: UpdateEntryPayload,
): Promise<VaultEntry> {
  const { encrypted_blob, iv, category_id } = await encryptPayload(payload)
  const response = await apiRequest<{ entry: RawVaultEntry }>(`/vault/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ encrypted_blob, iv, category_id }),
  })
  if (!response) throw new Error('No response from server.')
  return decryptRaw(response.entry)
}

export async function deleteVaultEntry(id: string): Promise<void> {
  await apiRequest(`/vault/${id}`, { method: 'DELETE' })
}

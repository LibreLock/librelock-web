import { apiRequest } from '@/services/api'
import { encryptBlob, decryptBlob } from '@/services/crypto'
import { getMasterKey } from '@/stores/auth'

export const ENTRY_COLORS: Array<{ label: string; bg: string }> = [
  { label: 'Red', bg: 'bg-rose-600' },
  { label: 'Orange', bg: 'bg-orange-500' },
  { label: 'Yellow', bg: 'bg-amber-400' },
  { label: 'Green', bg: 'bg-emerald-600' },
  { label: 'Blue', bg: 'bg-blue-500' },
  { label: 'Cyan', bg: 'bg-cyan-500' },
  { label: 'Violet', bg: 'bg-violet-500' },
  { label: 'Pink', bg: 'bg-pink-500' },
  { label: 'Slate', bg: 'bg-slate-500' },
  { label: 'Slate Dark', bg: 'bg-slate-800' },
]

export const DEFAULT_COLOR = 'bg-slate-800'

export interface VaultPassword {
  id: string
  type: 'password'
  name: string
  username: string
  email: string
  password: string
  url: string
  notes: string
  favorite: boolean
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
  favorite: boolean
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
  favorite?: boolean
}

export interface CreateNotePayload {
  type: 'note'
  name: string
  content: string
  color?: string
  categoryId?: string | null
  favorite?: boolean
}

export type CreateEntryPayload = CreatePasswordPayload | CreateNotePayload
export type UpdateEntryPayload = CreatePasswordPayload | CreateNotePayload

interface RawVaultEntry {
  id: string
  category_id: string | null
  encrypted_blob: string
  iv: string
  version: number
  created_at: string
  updated_at: string
}

interface VaultBlobData {
  type: 'password' | 'note'
  name: string
  username?: string
  email?: string
  password?: string
  url?: string
  notes?: string
  content?: string
  color: string
  favorite: boolean
}

function requireMasterKey(): CryptoKey {
  const key = getMasterKey()
  if (!key) throw new Error('Vault is locked — please log in again.')
  return key
}

function rawToEntry(raw: RawVaultEntry, blob: VaultBlobData): VaultEntry {
  const base = {
    id: raw.id,
    categoryId: raw.category_id,
    color: blob.color ?? DEFAULT_COLOR,
    favorite: blob.favorite ?? false,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }

  if (blob.type === 'note') {
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

async function encryptPayload(
  payload: CreateEntryPayload,
): Promise<{ encrypted_blob: string; iv: string; category_id: string | null | undefined }> {
  const masterKey = requireMasterKey()
  const blobData: VaultBlobData =
    payload.type === 'password'
      ? {
          type: 'password',
          name: payload.name,
          username: payload.username,
          email: payload.email,
          password: payload.password,
          url: payload.url,
          notes: payload.notes,
          color: payload.color ?? DEFAULT_COLOR,
          favorite: payload.favorite ?? false,
        }
      : {
          type: 'note',
          name: payload.name,
          content: payload.content,
          color: payload.color ?? DEFAULT_COLOR,
          favorite: payload.favorite ?? false,
        }

  const { encrypted_blob, iv } = await encryptBlob(blobData, masterKey)
  return { encrypted_blob, iv, category_id: payload.categoryId }
}

function scorePassword(password: string): number {
  let score = 0
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 20
  if (password.length >= 16) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[a-z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^A-Za-z0-9]/.test(password)) score += 20
  return Math.min(score, 100)
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
  const body = await encryptPayload(payload)
  const response = await apiRequest<{ entry: RawVaultEntry }>('/vault', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response) throw new Error('No response from server.')
  return decryptRaw(response.entry)
}

export async function updateVaultEntry(
  id: string,
  payload: UpdateEntryPayload,
): Promise<VaultEntry> {
  const body = await encryptPayload(payload)
  const response = await apiRequest<{ entry: RawVaultEntry }>(`/vault/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!response) throw new Error('No response from server.')
  return decryptRaw(response.entry)
}

export async function deleteVaultEntry(id: string): Promise<void> {
  await apiRequest(`/vault/${id}`, { method: 'DELETE' })
}

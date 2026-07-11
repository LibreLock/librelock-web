import { DEFAULT_COLOR } from '@/constants'
import { apiRequest } from '@/services/api'
import { encryptBlob, decryptBlob } from '@/services/crypto'
import { getVaultKey } from '@/services/keyring'

export type CardNetwork = 'visa' | 'mastercard' | null

export function detectCardNetwork(number: string): CardNetwork {
  const n = number.replace(/\D/g, '')
  if (n.length < 2) return null
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard'
  if (n.startsWith('4')) return 'visa'
  return null
}

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
  icon: string | null
  categoryId: string | null
  shared: boolean
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
  icon: string | null
  categoryId: string | null
  shared: boolean
  createdAt: string
  updatedAt: string
}

export interface VaultCard {
  id: string
  type: 'card'
  name: string
  cardholderName: string
  cardNumber: string
  expiration: string
  cvv: string
  notes: string
  network: CardNetwork
  color: string
  icon: string | null
  categoryId: string | null
  shared: boolean
  createdAt: string
  updatedAt: string
}

export type VaultEntry = VaultPassword | VaultNote | VaultCard

export interface CreatePasswordPayload {
  type: 'password'
  name: string
  username: string
  email: string
  password: string
  url: string
  notes: string
  color?: string
  icon?: string | null
  categoryId?: string | null
}

export interface CreateNotePayload {
  type: 'note'
  name: string
  content: string
  color?: string
  icon?: string | null
  categoryId?: string | null
}

export interface CreateCardPayload {
  type: 'card'
  name: string
  cardholderName: string
  cardNumber: string
  expiration: string
  cvv: string
  notes: string
  color?: string
  icon?: string | null
  categoryId?: string | null
}

export type CreateEntryPayload = CreatePasswordPayload | CreateNotePayload | CreateCardPayload
export type UpdateEntryPayload = CreatePasswordPayload | CreateNotePayload | CreateCardPayload

export interface RawVaultEntry {
  id: string
  type: 'password_entry' | 'note' | 'card'
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
  cardholderName?: string
  cardNumber?: string
  expiration?: string
  cvv?: string
  color: string
  icon?: string | null
}

function requireVaultKey(): CryptoKey {
  const key = getVaultKey()
  if (!key) throw new Error('Vault is locked -  log in again.')
  return key
}

function rawToEntry(raw: RawVaultEntry, blob: VaultBlobData, shared = false): VaultEntry {
  const base = {
    id: raw.id,
    categoryId: raw.category_id,
    shared,
    color: blob.color ?? DEFAULT_COLOR,
    icon: blob.icon ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }

  if (raw.type === 'note') {
    return { ...base, type: 'note', name: blob.name, content: blob.content ?? '' }
  }

  if (raw.type === 'card') {
    const cardNumber = blob.cardNumber ?? ''
    return {
      ...base,
      type: 'card',
      name: blob.name,
      cardholderName: blob.cardholderName ?? '',
      cardNumber,
      expiration: blob.expiration ?? '',
      cvv: blob.cvv ?? '',
      notes: blob.notes ?? '',
      network: detectCardNetwork(cardNumber),
    }
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
  return decryptRawWith(raw, requireVaultKey())
}

// Decrypts a raw entry with an explicit key, shared by the personal vault (vault key) and the organization vault (org key)
export async function decryptRawWith(
  raw: RawVaultEntry,
  key: CryptoKey,
  shared = false,
): Promise<VaultEntry> {
  const blob = (await decryptBlob(raw.encrypted_blob, raw.iv, key)) as VaultBlobData
  return rawToEntry(raw, blob, shared)
}

// Encrypts an entry payload's secret fields with an explicit key
// Category is handled separately by the caller (the org vault has none)
export async function encryptEntryBlob(
  payload: CreateEntryPayload,
  key: CryptoKey,
): Promise<{ encrypted_blob: string; iv: string; serverType: 'password_entry' | 'note' | 'card' }> {
  let blobData: VaultBlobData
  let serverType: 'password_entry' | 'note' | 'card'

  if (payload.type === 'password') {
    blobData = {
      name: payload.name,
      username: payload.username,
      email: payload.email,
      password: payload.password,
      url: payload.url,
      notes: payload.notes,
      color: payload.color ?? DEFAULT_COLOR,
      icon: payload.icon ?? null,
    }
    serverType = 'password_entry'
  } else if (payload.type === 'card') {
    blobData = {
      name: payload.name,
      cardholderName: payload.cardholderName,
      cardNumber: payload.cardNumber,
      expiration: payload.expiration,
      cvv: payload.cvv,
      notes: payload.notes,
      color: payload.color ?? DEFAULT_COLOR,
      icon: payload.icon ?? null,
    }
    serverType = 'card'
  } else {
    blobData = {
      name: payload.name,
      content: payload.content,
      color: payload.color ?? DEFAULT_COLOR,
      icon: payload.icon ?? null,
    }
    serverType = 'note'
  }

  const { encrypted_blob, iv } = await encryptBlob(blobData, key)
  return { encrypted_blob, iv, serverType }
}

async function encryptPayload(payload: CreateEntryPayload): Promise<{
  encrypted_blob: string
  iv: string
  category_id: string | null | undefined
  serverType: 'password_entry' | 'note' | 'card'
}> {
  const vaultKey = requireVaultKey()

  let blobData: VaultBlobData
  let serverType: 'password_entry' | 'note' | 'card'

  if (payload.type === 'password') {
    blobData = {
      name: payload.name,
      username: payload.username,
      email: payload.email,
      password: payload.password,
      url: payload.url,
      notes: payload.notes,
      color: payload.color ?? DEFAULT_COLOR,
      icon: payload.icon ?? null,
    }
    serverType = 'password_entry'
  } else if (payload.type === 'card') {
    blobData = {
      name: payload.name,
      cardholderName: payload.cardholderName,
      cardNumber: payload.cardNumber,
      expiration: payload.expiration,
      cvv: payload.cvv,
      notes: payload.notes,
      color: payload.color ?? DEFAULT_COLOR,
      icon: payload.icon ?? null,
    }
    serverType = 'card'
  } else {
    blobData = {
      name: payload.name,
      content: payload.content,
      color: payload.color ?? DEFAULT_COLOR,
      icon: payload.icon ?? null,
    }
    serverType = 'note'
  }

  const { encrypted_blob, iv } = await encryptBlob(blobData, vaultKey)
  return { encrypted_blob, iv, category_id: payload.categoryId, serverType }
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

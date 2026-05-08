// Mock API layer for vault entries.
// When the backend is ready, replace each function body with the real apiRequest call shown in comments.
// All types and signatures stay the same — only the implementation changes.

// import { apiRequest } from '@/services/api'

// ─── Color palette (class names must be literal strings for Tailwind scanning) ─

export const ENTRY_COLORS: Array<{ label: string; bg: string }> = [
  { label: 'Rose', bg: 'bg-rose-500' },
  { label: 'Orange', bg: 'bg-orange-500' },
  { label: 'Amber', bg: 'bg-amber-500' },
  { label: 'Emerald', bg: 'bg-emerald-600' },
  { label: 'Teal', bg: 'bg-teal-600' },
  { label: 'Sky', bg: 'bg-sky-500' },
  { label: 'Blue', bg: 'bg-blue-500' },
  { label: 'Indigo', bg: 'bg-indigo-500' },
  { label: 'Violet', bg: 'bg-violet-500' },
  { label: 'Pink', bg: 'bg-pink-500' },
]

export const DEFAULT_COLOR = 'bg-blue-500'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Mock data ────────────────────────────────────────────────────────────────

let mockEntries: VaultEntry[] = [
  {
    id: '1',
    type: 'password',
    name: 'GitHub',
    username: 'amaybury',
    email: 'avery@maybury.co',
    password: 'Tr0ub4dor&3xtra!',
    url: 'github.com',
    notes: 'Work account — personal repos also here.',
    favorite: true,
    color: 'bg-slate-700',
    categoryId: 'dev',
    passwordStrength: 94,
    reused: false,
    breached: false,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-04-20T14:30:00Z',
  },
  {
    id: '2',
    type: 'password',
    name: 'Fastmail',
    username: 'a.maybury',
    email: 'a.maybury@fastmail.com',
    password: 'M@ilV4ult#2025',
    url: 'fastmail.com',
    notes: '',
    favorite: true,
    color: 'bg-sky-500',
    categoryId: 'personal',
    passwordStrength: 88,
    reused: false,
    breached: false,
    createdAt: '2025-01-20T09:00:00Z',
    updatedAt: '2025-03-10T11:00:00Z',
  },
  {
    id: '3',
    type: 'password',
    name: 'Linear',
    username: 'avery@maybury.co',
    email: 'avery@maybury.co',
    password: 'L1n3ar$ecure99',
    url: 'linear.app',
    notes: 'Project management — shared with team.',
    favorite: true,
    color: 'bg-violet-500',
    categoryId: 'work',
    passwordStrength: 72,
    reused: false,
    breached: false,
    createdAt: '2025-02-01T12:00:00Z',
    updatedAt: '2025-04-05T16:00:00Z',
  },
  {
    id: '4',
    type: 'password',
    name: 'Figma',
    username: 'avery.maybury',
    email: 'avery@maybury.co',
    password: 'F!gm4Des1gn2025',
    url: 'figma.com',
    notes: '',
    favorite: true,
    color: 'bg-pink-500',
    categoryId: 'work',
    passwordStrength: 80,
    reused: true,
    breached: false,
    createdAt: '2025-02-10T08:00:00Z',
    updatedAt: '2025-04-15T10:00:00Z',
  },
  {
    id: '5',
    type: 'password',
    name: 'Northwind Studio',
    username: 'avery@maybury.co',
    email: 'avery@maybury.co',
    password: 'N0rthw!nd#2025!',
    url: 'northwind.studio',
    notes: 'Company internal portal.',
    favorite: false,
    color: 'bg-teal-600',
    categoryId: 'work',
    passwordStrength: 96,
    reused: false,
    breached: false,
    createdAt: '2025-03-01T14:00:00Z',
    updatedAt: '2025-05-01T09:00:00Z',
  },
  {
    id: '6',
    type: 'password',
    name: 'Vercel',
    username: 'amaybury',
    email: 'avery@maybury.co',
    password: 'V3rc3l!Deploy99',
    url: 'vercel.com',
    notes: '',
    favorite: false,
    color: 'bg-slate-800',
    categoryId: 'dev',
    passwordStrength: 55,
    reused: false,
    breached: true,
    createdAt: '2025-03-15T10:00:00Z',
    updatedAt: '2025-03-15T10:00:00Z',
  },
  {
    id: '7',
    type: 'note',
    name: 'AWS Root Credentials',
    content:
      'Account ID: 123456789012\nRoot email: aws-root@maybury.co\n\nAccess keys stored in 1Password.\nRotate annually. Last rotated: 2025-01-01.',
    favorite: false,
    color: 'bg-amber-500',
    categoryId: 'dev',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: '8',
    type: 'note',
    name: 'GitHub Recovery Codes',
    content:
      'Recovery codes for amaybury (use each only once):\n\n12345-abcde\n67890-fghij\n11111-klmno\n22222-pqrst\n33333-uvwxy\n\nGenerated: 2025-01-15. Regenerate if any used.',
    favorite: false,
    color: 'bg-emerald-600',
    categoryId: 'dev',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-15T10:30:00Z',
  },
]

let nextId = 9

function delay(ms = 150): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

// ─── API functions ─────────────────────────────────────────────────────────────

export async function getVaultEntries(): Promise<VaultEntry[]> {
  // Real: return apiRequest<VaultEntry[]>('/vault/entries')
  await delay()
  return mockEntries.map((e) => ({ ...e }))
}

export async function getVaultEntry(id: string): Promise<VaultEntry> {
  // Real: return apiRequest<VaultEntry>(`/vault/entries/${id}`)
  await delay()
  const entry = mockEntries.find((e) => e.id === id)
  if (!entry) throw new Error('Entry not found')
  return { ...entry }
}

export async function createVaultEntry(payload: CreateEntryPayload): Promise<VaultEntry> {
  // Real: return apiRequest<VaultEntry>('/vault/entries', { method: 'POST', body: JSON.stringify(payload) })
  await delay()
  const now = new Date().toISOString()
  const entry: VaultEntry =
    payload.type === 'password'
      ? {
          id: String(nextId++),
          type: 'password',
          name: payload.name,
          username: payload.username,
          email: payload.email,
          password: payload.password,
          url: payload.url,
          notes: payload.notes,
          favorite: false,
          color: payload.color ?? DEFAULT_COLOR,
          categoryId: payload.categoryId ?? null,
          passwordStrength: scorePassword(payload.password),
          reused: false,
          breached: false,
          createdAt: now,
          updatedAt: now,
        }
      : {
          id: String(nextId++),
          type: 'note',
          name: payload.name,
          content: payload.content,
          favorite: false,
          color: payload.color ?? DEFAULT_COLOR,
          categoryId: payload.categoryId ?? null,
          createdAt: now,
          updatedAt: now,
        }
  mockEntries.push(entry)
  return { ...entry }
}

export async function updateVaultEntry(
  id: string,
  payload: UpdateEntryPayload,
): Promise<VaultEntry> {
  // Real: return apiRequest<VaultEntry>(`/vault/entries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  await delay()
  const idx = mockEntries.findIndex((e) => e.id === id)
  if (idx === -1) throw new Error('Entry not found')
  const existing = mockEntries[idx]
  const updated = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  } as VaultEntry
  if (updated.type === 'password') {
    updated.passwordStrength = scorePassword(updated.password)
  }
  mockEntries[idx] = updated
  return { ...updated }
}

export async function deleteVaultEntry(id: string): Promise<void> {
  // Real: await apiRequest(`/vault/entries/${id}`, { method: 'DELETE' })
  await delay()
  mockEntries = mockEntries.filter((e) => e.id !== id)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

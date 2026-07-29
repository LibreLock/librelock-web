import { DEFAULT_COLOR, ENTRY_COLORS, KDF_ITER, KDF_MEMORY, KDF_PARALLELISM } from '@/constants'
import { decryptString, deriveKeys, encryptString, generateKdfSalt } from '@/services/crypto'
import type { CreateEntryPayload, VaultEntry } from '@/api/vault'

// Backup files are produced and consumed entirely in the browser: entries are decrypted with the
// vault (or org) key, re-serialised as plaintext, and optionally re-encrypted under a passphrase the
// user picks here. The server never sees either side of this - it only ever gets the usual opaque
// per-entry blobs when an import writes the restored entries back through the normal CRUD routes.

export const BACKUP_FORMAT = 'librelock.backup'
export const BACKUP_VERSION = 1

export type BackupScope = 'personal' | 'shared'

interface BackupEntryBase {
  name: string
  color: string
  icon: string | null
  /** Category *name*, not id: ids are meaningless in another account or instance. */
  category: string | null
  createdAt?: string
  updatedAt?: string
}

export type BackupEntry =
  | (BackupEntryBase & {
      type: 'password'
      username: string
      email: string
      password: string
      url: string
      notes: string
    })
  | (BackupEntryBase & { type: 'note'; content: string })
  | (BackupEntryBase & {
      type: 'card'
      cardholderName: string
      cardNumber: string
      expiration: string
      cvv: string
      notes: string
    })

export interface BackupPayload {
  categories: string[]
  entries: BackupEntry[]
}

interface BackupFileBase {
  format: typeof BACKUP_FORMAT
  version: number
  scope: BackupScope
  exportedAt: string
}

export interface PlainBackupFile extends BackupFileBase {
  encrypted: false
  payload: BackupPayload
}

export interface EncryptedBackupFile extends BackupFileBase {
  encrypted: true
  kdf: {
    algo: 'argon2id'
    salt: string
    iterations: number
    memory: number
    parallelism: number
  }
  /** base64(iv || ciphertext) of the JSON-encoded payload. */
  data: string
}

export type BackupFile = PlainBackupFile | EncryptedBackupFile

export class BackupError extends Error {}

// Export

function categoryNameOf(entry: VaultEntry, lookup: (id: string | null) => string): string | null {
  const name = lookup(entry.categoryId).trim()
  return name.length > 0 ? name : null
}

export function serializeEntry(
  entry: VaultEntry,
  lookup: (id: string | null) => string,
): BackupEntry {
  const base: BackupEntryBase = {
    name: entry.name,
    color: entry.color,
    icon: entry.icon,
    category: categoryNameOf(entry, lookup),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }

  if (entry.type === 'note') return { ...base, type: 'note', content: entry.content }

  if (entry.type === 'card') {
    return {
      ...base,
      type: 'card',
      cardholderName: entry.cardholderName,
      cardNumber: entry.cardNumber,
      expiration: entry.expiration,
      cvv: entry.cvv,
      notes: entry.notes,
    }
  }

  return {
    ...base,
    type: 'password',
    username: entry.username,
    email: entry.email,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
  }
}

export function buildPayload(
  entries: VaultEntry[],
  categories: string[],
  lookup: (id: string | null) => string,
): BackupPayload {
  return { categories: [...categories], entries: entries.map((e) => serializeEntry(e, lookup)) }
}

export async function buildBackupFile(
  scope: BackupScope,
  payload: BackupPayload,
  passphrase: string | null,
): Promise<BackupFile> {
  const base: BackupFileBase = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    scope,
    exportedAt: new Date().toISOString(),
  }

  if (!passphrase) return { ...base, encrypted: false, payload }

  const salt = generateKdfSalt()
  const { wrappingKey } = await deriveKeys(passphrase, {
    kdfSalt: salt,
    kdfIter: KDF_ITER,
    kdfMemory: KDF_MEMORY,
    kdfParallelism: KDF_PARALLELISM,
  })

  return {
    ...base,
    encrypted: true,
    kdf: {
      algo: 'argon2id',
      salt,
      iterations: KDF_ITER,
      memory: KDF_MEMORY,
      parallelism: KDF_PARALLELISM,
    },
    data: await encryptString(JSON.stringify(payload), wrappingKey),
  }
}

export function backupFilename(scope: BackupScope, encrypted: boolean): string {
  const date = new Date().toISOString().slice(0, 10)
  return `librelock-${scope}-${date}${encrypted ? '' : '-plaintext'}.json`
}

export function downloadBackup(file: BackupFile, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Import

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// Colors land in the DOM as utility classes, so anything not from the palette falls back
function sanitizeColor(value: unknown): string {
  const color = str(value)
  return ENTRY_COLORS.some((c) => c.bg === color) ? color : DEFAULT_COLOR
}

function parseEntry(raw: unknown): BackupEntry | null {
  if (!isRecord(raw)) return null

  const name = str(raw.name).trim()
  if (!name) return null

  const category = str(raw.category).trim()
  const base: BackupEntryBase = {
    name,
    color: sanitizeColor(raw.color),
    icon: typeof raw.icon === 'string' ? raw.icon : null,
    category: category.length > 0 ? category : null,
  }

  // Kept for the reader's benefit only: the server stamps its own timestamps on import
  if (typeof raw.createdAt === 'string') base.createdAt = raw.createdAt
  if (typeof raw.updatedAt === 'string') base.updatedAt = raw.updatedAt

  if (raw.type === 'note') return { ...base, type: 'note', content: str(raw.content) }

  if (raw.type === 'card') {
    return {
      ...base,
      type: 'card',
      cardholderName: str(raw.cardholderName),
      cardNumber: str(raw.cardNumber),
      expiration: str(raw.expiration),
      cvv: str(raw.cvv),
      notes: str(raw.notes),
    }
  }

  if (raw.type === 'password') {
    return {
      ...base,
      type: 'password',
      username: str(raw.username),
      email: str(raw.email),
      password: str(raw.password),
      url: str(raw.url),
      notes: str(raw.notes),
    }
  }

  return null
}

function parsePayload(raw: unknown): BackupPayload {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) {
    throw new BackupError('Backup file is missing its entries.')
  }

  const entries = raw.entries.map(parseEntry).filter((e): e is BackupEntry => e !== null)
  const categories = Array.isArray(raw.categories)
    ? [...new Set(raw.categories.map(str).map((c) => c.trim()))].filter((c) => c.length > 0)
    : []

  return { categories, entries }
}

/** Validates the envelope only - an encrypted file still needs {@link decryptPayload}. */
export function parseBackupFile(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('That file is not valid JSON.')
  }

  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) {
    throw new BackupError('That file is not a LibreLock backup.')
  }
  if (raw.version !== BACKUP_VERSION) {
    throw new BackupError(`Unsupported backup version (${str(raw.version) || raw.version}).`)
  }

  const scope: BackupScope = raw.scope === 'shared' ? 'shared' : 'personal'
  const base = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    scope,
    exportedAt: str(raw.exportedAt),
  } as const

  if (raw.encrypted === true) {
    const kdf = isRecord(raw.kdf) ? raw.kdf : null
    if (!kdf || typeof raw.data !== 'string') {
      throw new BackupError('Encrypted backup is missing its key parameters.')
    }
    return {
      ...base,
      encrypted: true,
      kdf: {
        algo: 'argon2id',
        salt: str(kdf.salt),
        iterations: Number(kdf.iterations) || KDF_ITER,
        memory: Number(kdf.memory) || KDF_MEMORY,
        parallelism: Number(kdf.parallelism) || KDF_PARALLELISM,
      },
      data: raw.data,
    }
  }

  return { ...base, encrypted: false, payload: parsePayload(raw.payload) }
}

export async function decryptPayload(
  file: EncryptedBackupFile,
  passphrase: string,
): Promise<BackupPayload> {
  const { wrappingKey } = await deriveKeys(passphrase, {
    kdfSalt: file.kdf.salt,
    kdfIter: file.kdf.iterations,
    kdfMemory: file.kdf.memory,
    kdfParallelism: file.kdf.parallelism,
  })

  let json: string
  try {
    json = await decryptString(file.data, wrappingKey)
  } catch {
    throw new BackupError('Wrong backup file password. Please try again.')
  }

  try {
    return parsePayload(JSON.parse(json))
  } catch (err) {
    if (err instanceof BackupError) throw err
    throw new BackupError('Backup contents are corrupt.')
  }
}

export function toCreatePayload(entry: BackupEntry, categoryId: string | null): CreateEntryPayload {
  const base = { name: entry.name, color: entry.color, icon: entry.icon, categoryId }

  if (entry.type === 'note') return { ...base, type: 'note', content: entry.content }

  if (entry.type === 'card') {
    return {
      ...base,
      type: 'card',
      cardholderName: entry.cardholderName,
      cardNumber: entry.cardNumber,
      expiration: entry.expiration,
      cvv: entry.cvv,
      notes: entry.notes,
    }
  }

  return {
    ...base,
    type: 'password',
    username: entry.username,
    email: entry.email,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
  }
}

// Identity used to skip entries the vault already holds: type + name + the primary secret
function fingerprint(type: string, name: string, secret: string): string {
  return `${type} ${name.trim().toLowerCase()} ${secret}`
}

export function fingerprintExisting(entry: VaultEntry): string {
  const secret =
    entry.type === 'password'
      ? entry.password
      : entry.type === 'card'
        ? entry.cardNumber
        : entry.content
  return fingerprint(entry.type, entry.name, secret)
}

export function fingerprintImported(entry: BackupEntry): string {
  const secret =
    entry.type === 'password'
      ? entry.password
      : entry.type === 'card'
        ? entry.cardNumber
        : entry.content
  return fingerprint(entry.type, entry.name, secret)
}

// Moving 2FA accounts in and out of LibreLock: Google Authenticator's "Export accounts" QR
// (otpauth-migration://, a protobuf in base64), plain otpauth:// lists as every other authenticator
// exports them, and the plain-text list LibreLock writes back out.

import {
  base32Encode,
  parseOtpInput,
  toOtpUri,
  type TotpAlgorithm,
  type TotpParams,
} from '@/services/totp'

export interface ParsedImport {
  items: TotpParams[]
  /** Counter-based (HOTP) accounts in the source; LibreLock only does time-based codes. */
  skippedHotp: number
  /** Lines or links that looked like codes but could not be read. */
  invalid: number
  /** Set for a single migration link: Google splits large exports into several numbered QR codes. */
  batch?: { id: number; index: number; size: number }
}

export function isMigrationLink(text: string): boolean {
  return /^otpauth-migration:\/\//i.test(text.trim())
}

// Minimal protobuf reader: only the wire types Google's MigrationPayload uses

class Reader {
  pos = 0
  constructor(private readonly buf: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.buf.length
  }

  varint(): number {
    let result = 0
    let scale = 1
    for (let i = 0; i < 10; i++) {
      const byte = this.buf[this.pos++]
      if (byte === undefined) throw new Error('Truncated data')
      result += (byte & 0x7f) * scale
      if ((byte & 0x80) === 0) return result
      scale *= 128
    }
    throw new Error('Bad varint')
  }

  bytes(): Uint8Array {
    const len = this.varint()
    const end = this.pos + len
    if (end > this.buf.length) throw new Error('Truncated data')
    const out = this.buf.subarray(this.pos, end)
    this.pos = end
    return out
  }

  skip(wire: number) {
    if (wire === 0) this.varint()
    else if (wire === 1) this.pos += 8
    else if (wire === 2) this.bytes()
    else if (wire === 5) this.pos += 4
    else throw new Error('Unsupported field type')
    if (this.pos > this.buf.length) throw new Error('Truncated data')
  }
}

const decoder = new TextDecoder()
const ALGORITHMS: Record<number, TotpAlgorithm | null> = {
  0: 'SHA1',
  1: 'SHA1',
  2: 'SHA256',
  3: 'SHA512',
  4: null, // MD5: no Web Crypto support, and no site should still be using it
}

interface Account {
  params: TotpParams | null
  hotp: boolean
}

function readAccount(bytes: Uint8Array): Account {
  const r = new Reader(bytes)
  let secret: Uint8Array = new Uint8Array(0)
  let name = ''
  let issuer = ''
  let algorithm = 0
  let digits = 0
  let type = 0

  while (!r.done) {
    const tag = r.varint()
    const field = Math.floor(tag / 8)
    const wire = tag % 8
    if (field === 1 && wire === 2) secret = r.bytes()
    else if (field === 2 && wire === 2) name = decoder.decode(r.bytes())
    else if (field === 3 && wire === 2) issuer = decoder.decode(r.bytes())
    else if (field === 4 && wire === 0) algorithm = r.varint()
    else if (field === 5 && wire === 0) digits = r.varint()
    else if (field === 6 && wire === 0) type = r.varint()
    else r.skip(wire)
  }

  if (type === 1) return { params: null, hotp: true }
  const algo = ALGORITHMS[algorithm]
  if (!algo || secret.length === 0) return { params: null, hotp: false }

  // Google writes the label as "Issuer:account" and repeats the issuer in its own field
  const colon = name.indexOf(':')
  const account = (colon === -1 ? name : name.slice(colon + 1)).trim()
  const labelIssuer = colon === -1 ? '' : name.slice(0, colon).trim()

  return {
    hotp: false,
    params: {
      secret: base32Encode(secret),
      issuer: (issuer || labelIssuer).trim(),
      account,
      digits: digits === 2 ? 8 : 6,
      period: 30,
      algorithm: algo,
    },
  }
}

function decodeBase64(data: string): Uint8Array {
  // A "+" in a URL query is read back as a space, and exports are sometimes url-safe
  const clean = data.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

export function parseMigrationLink(link: string): ParsedImport | null {
  const match = /[?&]data=([^&#\s]+)/i.exec(link)
  if (!match?.[1]) return null

  let payload: Uint8Array
  try {
    payload = decodeBase64(decodeURIComponent(match[1]))
  } catch {
    return null
  }

  const result: ParsedImport = { items: [], skippedHotp: 0, invalid: 0 }
  const batch = { id: 0, index: 0, size: 0 }
  try {
    const r = new Reader(payload)
    while (!r.done) {
      const tag = r.varint()
      const field = Math.floor(tag / 8)
      const wire = tag % 8
      if (field === 1 && wire === 2) {
        const account = readAccount(r.bytes())
        if (account.params) result.items.push(account.params)
        else if (account.hotp) result.skippedHotp++
        else result.invalid++
      } else if (field === 3 && wire === 0) batch.size = r.varint()
      else if (field === 4 && wire === 0) batch.index = r.varint()
      else if (field === 5 && wire === 0) batch.id = r.varint()
      else r.skip(wire)
    }
  } catch {
    return null
  }
  if (batch.size > 1) result.batch = batch
  return result
}

/**
 * Reads everything importable out of free text: Google Authenticator migration links and
 * otpauth:// links, one per line or separated by whitespace. Anything else is ignored, so a
 * pasted block can carry stray text.
 */
export function parseImportText(text: string): ParsedImport {
  const result: ParsedImport = { items: [], skippedHotp: 0, invalid: 0 }

  for (const token of text.split(/\s+/)) {
    if (!token) continue

    if (isMigrationLink(token)) {
      const parsed = parseMigrationLink(token)
      if (!parsed) {
        result.invalid++
        continue
      }
      result.items.push(...parsed.items)
      result.skippedHotp += parsed.skippedHotp
      result.invalid += parsed.invalid
    } else if (/^otpauth:\/\//i.test(token)) {
      if (/^otpauth:\/\/hotp/i.test(token)) {
        result.skippedHotp++
        continue
      }
      const parsed = parseOtpInput(token)
      if (parsed.ok) result.items.push(parsed.params)
      else result.invalid++
    }
  }
  return result
}

/** An otpauth account label is an email or a username; entries keep them in separate fields. */
export function accountFields(account: string): { username: string; email: string } {
  return account.includes('@') ? { username: '', email: account } : { username: account, email: '' }
}

/** Drops accounts that repeat a secret already seen, keeping the first. */
export function dedupeBySecret(items: TotpParams[]): TotpParams[] {
  const seen = new Set<string>()
  return items.filter((p) => {
    if (seen.has(p.secret)) return false
    seen.add(p.secret)
    return true
  })
}

export interface ExportableEntry {
  name: string
  username: string
  email: string
  totp: string
}

/**
 * One otpauth:// link per line: the format every other authenticator imports. The name and account
 * are filled from the entry when the stored link was a bare key and carries neither.
 */
export function buildOtpauthList(entries: ExportableEntry[]): string {
  const lines: string[] = []
  for (const entry of entries) {
    const parsed = parseOtpInput(entry.totp)
    if (!parsed.ok) continue
    lines.push(
      toOtpUri({
        ...parsed.params,
        issuer: parsed.params.issuer || entry.name,
        account: parsed.params.account || entry.username || entry.email,
      }),
    )
  }
  return lines.join('\n') + (lines.length > 0 ? '\n' : '')
}

export interface PlanEntry {
  name: string
  username: string
  email: string
  shared: boolean
  totp: string | null
}

export type ImportStatus = 'new' | 'merge' | 'duplicate'

export interface ImportRow<E extends PlanEntry> {
  params: TotpParams
  name: string
  status: ImportStatus
  /** For `merge`: the existing entry that takes the code. */
  target: E | null
}

export function displayName(p: TotpParams): string {
  return p.issuer || p.account || 'Imported account'
}

/**
 * Decides what importing each account would do:
 * - `duplicate`: its secret is already on an entry (shared ones too), so re-importing an export
 *   adds nothing
 * - `merge`: a private entry with the same name and no 2FA yet takes the code, instead of a
 *   near-duplicate appearing beside it. An entry that names a different account is left alone
 * - `new`: otherwise a new entry
 */
export function planImport<E extends PlanEntry>(items: TotpParams[], entries: E[]): ImportRow<E>[] {
  const taken = new Set<string>()
  for (const e of entries) {
    if (!e.totp) continue
    const p = parseOtpInput(e.totp)
    if (p.ok) taken.add(p.params.secret)
  }

  // An entry can only take one code
  const claimed = new Set<E>()

  return items.map((params) => {
    const name = displayName(params)
    if (taken.has(params.secret)) return { params, name, status: 'duplicate', target: null }

    const wanted = name.toLowerCase()
    const account = params.account.toLowerCase()
    const candidates = entries.filter(
      (e) => !e.shared && !e.totp && !claimed.has(e) && e.name.trim().toLowerCase() === wanted,
    )
    const target =
      candidates.find(
        (e) => account && [e.username, e.email].some((v) => v.toLowerCase() === account),
      ) ??
      candidates.find((e) => !e.username && !e.email) ??
      (account ? null : (candidates[0] ?? null))

    if (!target) return { params, name, status: 'new', target: null }
    claimed.add(target)
    return { params, name, status: 'merge', target }
  })
}

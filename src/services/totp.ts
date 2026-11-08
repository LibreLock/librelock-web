// RFC 6238 TOTP, implemented on Web Crypto so no dependency ships for it. Secrets are stored in the
// encrypted vault blob as a normalized otpauth:// URI, so digits / period / algorithm survive.

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512'

export interface TotpParams {
  secret: string // upper-case base32, no padding or spaces
  issuer: string
  account: string
  digits: number
  period: number
  algorithm: TotpAlgorithm
}

export type ParseResult = { ok: true; params: TotpParams } | { ok: false; error: string }

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const HASH_NAME: Record<TotpAlgorithm, string> = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
}

export function cleanBase32(input: string): string {
  return input.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase()
}

export function base32Decode(input: string): Uint8Array {
  const clean = cleanBase32(input)
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch)
    if (idx === -1) throw new Error('Secret contains characters that are not valid base32.')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}

export function base32Encode(bytes: Uint8Array): string {
  let out = ''
  let bits = 0
  let value = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

function isValidSecret(secret: string): boolean {
  if (secret.length < 8) return false
  try {
    return base32Decode(secret).length >= 5
  } catch {
    return false
  }
}

function intParam(raw: string | null, fallback: number, min: number, max: number): number | null {
  if (raw === null || raw === '') return fallback
  const n = Number(raw)
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

export function parseOtpInput(input: string): ParseResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Enter a setup key or an otpauth:// link.' }

  if (/^otpauth:\/\//i.test(text)) {
    let url: URL
    try {
      url = new URL(text)
    } catch {
      return { ok: false, error: 'That otpauth:// link is malformed.' }
    }
    if (url.hostname.toLowerCase() === 'hotp') {
      return { ok: false, error: 'Counter-based (HOTP) codes are not supported, only time-based.' }
    }
    if (url.hostname.toLowerCase() !== 'totp') {
      return { ok: false, error: 'Only time-based (otpauth://totp) links are supported.' }
    }

    const q = url.searchParams
    const secret = cleanBase32(q.get('secret') ?? '')
    if (!isValidSecret(secret)) return { ok: false, error: 'The link has no valid secret.' }

    const label = decodeURIComponent(url.pathname.replace(/^\//, ''))
    const colon = label.indexOf(':')
    const labelIssuer = colon === -1 ? '' : label.slice(0, colon).trim()
    const account = (colon === -1 ? label : label.slice(colon + 1)).trim()

    const algRaw = (q.get('algorithm') ?? 'SHA1').toUpperCase()
    if (algRaw !== 'SHA1' && algRaw !== 'SHA256' && algRaw !== 'SHA512') {
      return { ok: false, error: `Unsupported algorithm ${algRaw}.` }
    }
    const digits = intParam(q.get('digits'), 6, 6, 8)
    const period = intParam(q.get('period'), 30, 5, 300)
    if (digits === null) return { ok: false, error: 'Digits must be between 6 and 8.' }
    if (period === null) return { ok: false, error: 'Period must be between 5 and 300 seconds.' }

    return {
      ok: true,
      params: {
        secret,
        issuer: (q.get('issuer') ?? labelIssuer).trim(),
        account,
        digits,
        period,
        algorithm: algRaw,
      },
    }
  }

  const secret = cleanBase32(text)
  if (!isValidSecret(secret)) {
    return { ok: false, error: 'That is not a valid setup key (letters A-Z and digits 2-7).' }
  }
  return {
    ok: true,
    params: { secret, issuer: '', account: '', digits: 6, period: 30, algorithm: 'SHA1' },
  }
}

export function toOtpUri(p: TotpParams): string {
  const label = p.issuer
    ? `${encodeURIComponent(p.issuer)}:${encodeURIComponent(p.account)}`
    : encodeURIComponent(p.account)
  const query = new URLSearchParams({ secret: p.secret })
  if (p.issuer) query.set('issuer', p.issuer)
  if (p.algorithm !== 'SHA1') query.set('algorithm', p.algorithm)
  if (p.digits !== 6) query.set('digits', String(p.digits))
  if (p.period !== 30) query.set('period', String(p.period))
  return `otpauth://totp/${label}?${query.toString()}`
}

/** Normalizes any accepted input (raw key or URI) to the URI form that gets stored. */
export function normalizeOtpInput(input: string): string | null {
  const parsed = parseOtpInput(input)
  return parsed.ok ? toOtpUri(parsed.params) : null
}

export async function generateTotp(p: TotpParams, nowMs: number = Date.now()): Promise<string> {
  const counter = Math.floor(nowMs / 1000 / p.period)
  const msg = new ArrayBuffer(8)
  new DataView(msg).setBigUint64(0, BigInt(counter))

  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(p.secret) as BufferSource,
    { name: 'HMAC', hash: HASH_NAME[p.algorithm] },
    false,
    ['sign'],
  )
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg))
  const at = (i: number) => mac[i] ?? 0
  const offset = at(mac.length - 1) & 0x0f
  const bin =
    ((at(offset) & 0x7f) << 24) | (at(offset + 1) << 16) | (at(offset + 2) << 8) | at(offset + 3)
  return String(bin % 10 ** p.digits).padStart(p.digits, '0')
}

export function secondsRemaining(period: number, nowMs: number = Date.now()): number {
  return period - (Math.floor(nowMs / 1000) % period)
}

/** "123456" -> "123 456" (or "1234 5678" for 8 digits) for readability. */
export function formatCode(code: string): string {
  const half = Math.ceil(code.length / 2)
  return `${code.slice(0, half)} ${code.slice(half)}`
}

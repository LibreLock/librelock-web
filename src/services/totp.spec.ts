import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  formatCode,
  generateTotp,
  normalizeOtpInput,
  parseOtpInput,
  secondsRemaining,
  toOtpUri,
  type TotpAlgorithm,
  type TotpParams,
} from './totp'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(text: string): string {
  let bits = ''
  for (const b of new TextEncoder().encode(text)) bits += b.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i < bits.length; i += 5)
    out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]
  return out
}

// RFC 6238 appendix B: the ASCII key is "1234567890" repeated to the hash's block-ish length
const KEYS: Record<TotpAlgorithm, string> = {
  SHA1: '12345678901234567890',
  SHA256: '12345678901234567890123456789012',
  SHA512: '1234567890123456789012345678901234567890123456789012345678901234',
}

function params(algorithm: TotpAlgorithm): TotpParams {
  return {
    secret: base32Encode(KEYS[algorithm]),
    issuer: '',
    account: '',
    digits: 8,
    period: 30,
    algorithm,
  }
}

describe('generateTotp (RFC 6238 vectors)', () => {
  it.each([
    ['SHA1', 59, '94287082'],
    ['SHA1', 1111111109, '07081804'],
    ['SHA1', 1234567890, '89005924'],
    ['SHA1', 2000000000, '69279037'],
    ['SHA256', 59, '46119246'],
    ['SHA256', 1111111109, '68084774'],
    ['SHA512', 59, '90693936'],
    ['SHA512', 1111111109, '25091201'],
  ] as const)('%s at %i', async (alg, t, expected) => {
    expect(await generateTotp(params(alg), t * 1000)).toBe(expected)
  })

  it('pads codes with leading zeros', async () => {
    expect(await generateTotp(params('SHA1'), 1111111109_000)).toBe('07081804')
  })
})

describe('base32', () => {
  it('decodes ignoring case, spaces and padding', () => {
    expect(new TextDecoder().decode(base32Decode('mzxw 6ytb oi======'))).toBe('foobar')
  })
  it('rejects invalid characters', () => {
    expect(() => base32Decode('abc1')).toThrow(/base32/)
  })
})

describe('parseOtpInput', () => {
  it('accepts a raw key with defaults', () => {
    const r = parseOtpInput('jbsw y3dp ehpk 3pxp')
    expect(r.ok && r.params).toMatchObject({
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    })
  })

  it('reads issuer, account and options from a URI', () => {
    const r = parseOtpInput(
      'otpauth://totp/Acme%20Inc:bob@acme.com?secret=JBSWY3DPEHPK3PXP&issuer=Acme%20Inc&digits=8&period=60&algorithm=SHA256',
    )
    expect(r.ok && r.params).toMatchObject({
      issuer: 'Acme Inc',
      account: 'bob@acme.com',
      digits: 8,
      period: 60,
      algorithm: 'SHA256',
    })
  })

  it('rejects hotp, junk and empty input', () => {
    expect(parseOtpInput('otpauth://hotp/x?secret=JBSWY3DPEHPK3PXP&counter=1').ok).toBe(false)
    expect(parseOtpInput('not a key!').ok).toBe(false)
    expect(parseOtpInput('   ').ok).toBe(false)
  })

  it('round-trips through toOtpUri', () => {
    const r = parseOtpInput('otpauth://totp/Acme:bob?secret=JBSWY3DPEHPK3PXP&issuer=Acme&digits=8')
    if (!r.ok) throw new Error('parse failed')
    expect(parseOtpInput(toOtpUri(r.params))).toEqual(r)
  })

  it('normalizeOtpInput returns null for bad input', () => {
    expect(normalizeOtpInput('nope!')).toBeNull()
    expect(normalizeOtpInput('JBSWY3DPEHPK3PXP')).toContain('otpauth://totp/')
  })
})

describe('helpers', () => {
  it('computes the seconds left in the window', () => {
    expect(secondsRemaining(30, 0)).toBe(30)
    expect(secondsRemaining(30, 29_000)).toBe(1)
    expect(secondsRemaining(30, 31_000)).toBe(29)
  })
  it('groups digits', () => {
    expect(formatCode('123456')).toBe('123 456')
    expect(formatCode('12345678')).toBe('1234 5678')
  })
})

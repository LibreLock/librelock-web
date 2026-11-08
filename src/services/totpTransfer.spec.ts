import { describe, expect, it } from 'vitest'
import { base32Decode, base32Encode, parseOtpInput } from './totp'
import {
  buildOtpauthList,
  dedupeBySecret,
  isMigrationLink,
  parseImportText,
  parseMigrationLink,
  planImport,
  type PlanEntry,
} from './totpTransfer'

// Independent encoder for Google's MigrationPayload, so the decoder is not tested against itself
const enc = new TextEncoder()

function varint(n: number): number[] {
  const out: number[] = []
  let v = n
  while (v >= 128) {
    out.push((v % 128) | 128)
    v = Math.floor(v / 128)
  }
  out.push(v)
  return out
}
const lenField = (field: number, data: number[] | Uint8Array) => [
  ...varint(field * 8 + 2),
  ...varint(data.length),
  ...data,
]
const intField = (field: number, n: number) => [...varint(field * 8), ...varint(n)]

interface Acct {
  secret: Uint8Array
  name: string
  issuer?: string
  algorithm?: number
  digits?: number
  type?: number
}

function account(a: Acct): number[] {
  return [
    ...lenField(1, a.secret),
    ...lenField(2, enc.encode(a.name)),
    ...(a.issuer ? lenField(3, enc.encode(a.issuer)) : []),
    ...intField(4, a.algorithm ?? 1),
    ...intField(5, a.digits ?? 1),
    ...intField(6, a.type ?? 2),
  ]
}

function link(accounts: Acct[], extra: number[] = []): string {
  const payload = [
    ...accounts.flatMap((a) => lenField(1, account(a))),
    ...intField(2, 1), // version
    ...intField(3, 1), // batch_size
    ...intField(4, 0), // batch_index
    ...extra,
  ]
  const b64 = btoa(String.fromCharCode(...payload))
  return `otpauth-migration://offline?data=${encodeURIComponent(b64)}`
}

const SECRET = enc.encode('Hello!\xde\xad\xbe\xef')

describe('base32Encode', () => {
  it('round-trips with the decoder for every length', () => {
    for (let n = 1; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + n) % 256)
      expect([...base32Decode(base32Encode(bytes))]).toEqual([...bytes])
    }
  })
  it('matches a known vector', () => {
    expect(base32Encode(enc.encode('foobar'))).toBe('MZXW6YTBOI')
  })
})

describe('parseMigrationLink', () => {
  it('reads accounts, splitting the Issuer:account label', () => {
    const parsed = parseMigrationLink(
      link([
        { secret: SECRET, name: 'Example:alice@google.com', issuer: 'Example' },
        { secret: enc.encode('12345678901234567890'), name: 'bob', algorithm: 2, digits: 2 },
      ]),
    )
    expect(parsed?.items).toHaveLength(2)
    expect(parsed?.items[0]).toMatchObject({
      issuer: 'Example',
      account: 'alice@google.com',
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    })
    expect(parsed?.items[0]?.secret).toBe(base32Encode(SECRET))
    expect(parsed?.items[1]).toMatchObject({ account: 'bob', digits: 8, algorithm: 'SHA256' })
  })

  it('survives a "+" turned into a space and unencoded padding', () => {
    // Secrets chosen so the base64 contains "+" and "/"
    const l = link([{ secret: Uint8Array.from([0xfb, 0xff, 0xfe, 0xfb, 0xef]), name: 'x' }])
    const mangled = l.replace(/%2B/g, ' ').replace(/%3D/g, '')
    expect(parseMigrationLink(mangled)?.items).toHaveLength(1)
  })

  it('counts HOTP and unusable accounts instead of importing them', () => {
    const parsed = parseMigrationLink(
      link([
        { secret: SECRET, name: 'counter', type: 1 },
        { secret: SECRET, name: 'md5', algorithm: 4 },
        { secret: SECRET, name: 'good' },
      ]),
    )
    expect(parsed?.items.map((i) => i.account)).toEqual(['good'])
    expect(parsed?.skippedHotp).toBe(1)
    expect(parsed?.invalid).toBe(1)
  })

  it('reports which numbered QR code of an export this is', () => {
    const payload = [
      ...lenField(1, account({ secret: SECRET, name: 'a' })),
      ...intField(2, 1),
      ...intField(3, 3),
      ...intField(4, 1),
      ...intField(5, 987654),
    ]
    const l = `otpauth-migration://offline?data=${encodeURIComponent(btoa(String.fromCharCode(...payload)))}`
    expect(parseMigrationLink(l)?.batch).toEqual({ id: 987654, index: 1, size: 3 })
    // A single-code export has no batch worth reporting
    expect(parseMigrationLink(link([{ secret: SECRET, name: 'a' }]))?.batch).toBeUndefined()
  })

  it('skips fields it does not know', () => {
    const parsed = parseMigrationLink(link([{ secret: SECRET, name: 'a' }], intField(9, 123456)))
    expect(parsed?.items).toHaveLength(1)
  })

  it('returns null for garbage', () => {
    expect(parseMigrationLink('otpauth-migration://offline')).toBeNull()
    expect(parseMigrationLink('otpauth-migration://offline?data=!!!')).toBeNull()
    expect(parseMigrationLink('otpauth-migration://offline?data=CgQ')).toBeNull()
  })
})

describe('parseImportText', () => {
  const uriA = 'otpauth://totp/GitHub:octo?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'
  const uriB = 'otpauth://totp/Bank:me?secret=GEZDGNBVGY3TQOJQ&issuer=Bank&digits=8'

  it('collects otpauth links and migration links from one pasted block', () => {
    const text = `Here are my codes:\n${uriA}\n\n${link([{ secret: SECRET, name: 'Example:a' }])}\n${uriB}\nthanks`
    const parsed = parseImportText(text)
    expect(parsed.items).toHaveLength(3)
    expect(parsed.invalid).toBe(0)
  })

  it('counts bad links and HOTP separately', () => {
    const parsed = parseImportText(
      `otpauth://totp/x?secret=!!\notpauth://hotp/y?secret=JBSWY3DPEHPK3PXP&counter=1\n${uriA}`,
    )
    expect(parsed.items).toHaveLength(1)
    expect(parsed.invalid).toBe(1)
    expect(parsed.skippedHotp).toBe(1)
  })

  it('detects migration links', () => {
    expect(isMigrationLink(' otpauth-migration://offline?data=x')).toBe(true)
    expect(isMigrationLink(uriA)).toBe(false)
  })
})

describe('dedupeBySecret / buildOtpauthList', () => {
  it('keeps the first account per secret', () => {
    const a = parseOtpInput('JBSWY3DPEHPK3PXP')
    const b = parseOtpInput('jbsw y3dp ehpk 3pxp')
    if (!a.ok || !b.ok) throw new Error('parse failed')
    expect(dedupeBySecret([a.params, b.params])).toHaveLength(1)
  })

  it('exports one link per line, filling name and account from the entry', () => {
    const text = buildOtpauthList([
      { name: 'GitHub', username: 'octo', email: '', totp: 'JBSWY3DPEHPK3PXP' },
      { name: 'Broken', username: '', email: '', totp: 'nope!' },
      {
        name: 'Ignored',
        username: 'u',
        email: '',
        totp: 'otpauth://totp/Bank:me?secret=GEZDGNBVGY3TQOJQ&issuer=Bank',
      },
    ])
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(2)
    const first = parseOtpInput(lines[0] ?? '')
    expect(first.ok && first.params).toMatchObject({ issuer: 'GitHub', account: 'octo' })
    // A link that already names its issuer and account keeps them
    const second = parseOtpInput(lines[1] ?? '')
    expect(second.ok && second.params).toMatchObject({ issuer: 'Bank', account: 'me' })
    // And the export imports back cleanly
    expect(parseImportText(text).items).toHaveLength(2)
  })

  it('writes nothing for an empty list', () => {
    expect(buildOtpauthList([])).toBe('')
  })
})

describe('planImport', () => {
  const item = (secret: string, issuer = '', account = '') => {
    const p = parseOtpInput(secret)
    if (!p.ok) throw new Error('parse failed')
    return { ...p.params, issuer, account }
  }
  const entry = (over: Partial<PlanEntry> & { name: string }): PlanEntry => ({
    username: '',
    email: '',
    shared: false,
    totp: null,
    ...over,
  })

  it('marks a secret that is already stored as a duplicate, shared entries included', () => {
    const rows = planImport(
      [item('JBSWY3DPEHPK3PXP', 'GitHub'), item('GEZDGNBVGY3TQOJQ', 'Bank')],
      [
        entry({ name: 'GitHub', totp: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' }),
        entry({ name: 'Bank', shared: true, totp: 'GEZDGNBVGY3TQOJQ' }),
      ],
    )
    expect(rows.map((r) => r.status)).toEqual(['duplicate', 'duplicate'])
  })

  it('adds the code to a private entry of the same name that has none', () => {
    const github = entry({ name: 'GitHub' })
    const [row] = planImport([item('JBSWY3DPEHPK3PXP', 'github')], [github])
    expect(row?.status).toBe('merge')
    expect(row?.target).toBe(github)
  })

  it('leaves an entry for a different account alone', () => {
    const rows = planImport(
      [item('JBSWY3DPEHPK3PXP', 'GitHub', 'work@acme.com')],
      [entry({ name: 'GitHub', email: 'me@home.com' })],
    )
    expect(rows[0]?.status).toBe('new')
  })

  it('prefers the entry whose account matches', () => {
    const work = entry({ name: 'GitHub', email: 'work@acme.com' })
    const home = entry({ name: 'GitHub', email: 'me@home.com' })
    const [row] = planImport([item('JBSWY3DPEHPK3PXP', 'GitHub', 'me@home.com')], [work, home])
    expect(row?.target).toBe(home)
  })

  it('never merges into a shared entry or one that already has 2FA', () => {
    const rows = planImport(
      [item('JBSWY3DPEHPK3PXP', 'GitHub')],
      [
        entry({ name: 'GitHub', shared: true }),
        entry({ name: 'GitHub', totp: 'GEZDGNBVGY3TQOJQ' }),
      ],
    )
    expect(rows[0]?.status).toBe('new')
  })

  it('gives each entry at most one code', () => {
    const only = entry({ name: 'GitHub' })
    const rows = planImport(
      [item('JBSWY3DPEHPK3PXP', 'GitHub'), item('GEZDGNBVGY3TQOJQ', 'GitHub')],
      [only],
    )
    expect(rows.map((r) => r.status)).toEqual(['merge', 'new'])
  })

  it('names an account without an issuer after its account', () => {
    expect(planImport([item('JBSWY3DPEHPK3PXP', '', 'bob')], [])[0]?.name).toBe('bob')
  })
})

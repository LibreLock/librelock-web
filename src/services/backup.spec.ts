import { describe, expect, it } from 'vitest'
import {
  BackupError,
  buildBackupFile,
  buildPayload,
  decryptPayload,
  parseBackupFile,
  toCreatePayload,
} from '@/services/backup'
import { DEFAULT_COLOR } from '@/constants'
import type { VaultEntry } from '@/api/vault'

const password: VaultEntry = {
  id: '1',
  type: 'password',
  name: 'GitHub',
  username: 'octo',
  email: 'octo@example.com',
  password: 'hunter2',
  url: 'https://github.com',
  notes: 'work account',
  ssoProvider: null,
  ssoLabel: '',
  ssoEntryId: null,
  excludeFromAnalytics: false,
  color: 'bg-blue-500',
  icon: null,
  categoryId: 'cat-1',
  shared: false,
  passwordStrength: 4,
  reused: false,
  breached: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
}

const note: VaultEntry = {
  id: '2',
  type: 'note',
  name: 'Recovery codes',
  content: 'abc-def',
  color: 'bg-red-600',
  icon: 'note',
  categoryId: null,
  shared: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const lookup = (id: string | null) => (id === 'cat-1' ? 'Work' : '')

// Envelope for hand-built plaintext files in the tests below
const blankFile = {
  format: 'librelock.backup',
  version: 1,
  scope: 'personal',
  exportedAt: '2026-01-01T00:00:00Z',
  encrypted: false,
}

describe('backup', () => {
  it('serializes entries with category names and without ids or derived fields', () => {
    const payload = buildPayload([password, note], ['Work'], lookup)

    expect(payload.entries.at(0)).toEqual({
      type: 'password',
      name: 'GitHub',
      username: 'octo',
      email: 'octo@example.com',
      password: 'hunter2',
      url: 'https://github.com',
      notes: 'work account',
      ssoProvider: null,
      ssoLabel: '',
      ssoEntry: null,
      excludeFromAnalytics: false,
      color: 'bg-blue-500',
      icon: null,
      category: 'Work',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    })
    expect(payload.entries.at(1)?.category).toBeNull()
  })

  it('round-trips a plaintext backup', async () => {
    const payload = buildPayload([password, note], ['Work'], lookup)
    const file = await buildBackupFile('personal', payload, null)
    const parsed = parseBackupFile(JSON.stringify(file))

    expect(parsed.encrypted).toBe(false)
    expect(parsed.encrypted === false && parsed.payload).toEqual(payload)
  })

  it('round-trips an encrypted backup and rejects the wrong password', async () => {
    const payload = buildPayload([password], ['Work'], lookup)
    const file = await buildBackupFile('shared', payload, 'correct horse')
    const serialized = JSON.stringify(file)

    expect(serialized).not.toContain('hunter2')

    const parsed = parseBackupFile(serialized)
    expect(parsed.encrypted).toBe(true)
    if (!parsed.encrypted) throw new Error('expected an encrypted file')

    expect(parsed.scope).toBe('shared')
    await expect(decryptPayload(parsed, 'correct horse')).resolves.toEqual(payload)
    await expect(decryptPayload(parsed, 'wrong horse')).rejects.toBeInstanceOf(BackupError)
  }, 30000)

  it('rejects files that are not backups', () => {
    expect(() => parseBackupFile('not json')).toThrow(BackupError)
    expect(() => parseBackupFile('{"format":"other","version":1}')).toThrow(BackupError)
    expect(() => parseBackupFile('{"format":"librelock.backup","version":99}')).toThrow(BackupError)
  })

  it('drops unusable entries and falls back to a known color', () => {
    const file = JSON.stringify({
      format: 'librelock.backup',
      version: 1,
      scope: 'personal',
      exportedAt: '2026-01-01T00:00:00Z',
      encrypted: false,
      payload: {
        categories: ['Work', 'Work', '  '],
        entries: [
          { type: 'password', name: '' },
          { type: 'wat', name: 'nope' },
          { type: 'note', name: 'Keep', content: 'x', color: 'bg-evil-500' },
        ],
      },
    })

    const parsed = parseBackupFile(file)
    if (parsed.encrypted) throw new Error('expected a plaintext file')

    expect(parsed.payload.categories).toEqual(['Work'])
    expect(parsed.payload.entries).toHaveLength(1)
    expect(parsed.payload.entries.at(0)?.color).toBe(DEFAULT_COLOR)
  })

  it('round-trips an SSO-only entry and the analytics opt-out', () => {
    const sso: VaultEntry = {
      ...(password as Extract<VaultEntry, { type: 'password' }>),
      id: '3',
      name: 'Figma',
      password: '',
      ssoProvider: 'google',
      ssoLabel: '',
      excludeFromAnalytics: true,
    }

    const payload = buildPayload([sso], [], lookup)
    const parsed = parseBackupFile(JSON.stringify({ ...blankFile, payload }))
    if (parsed.encrypted) throw new Error('expected a plaintext file')

    const [entry] = parsed.payload.entries
    if (!entry || entry.type !== 'password') throw new Error('expected a password entry')

    expect(entry.password).toBe('')
    expect(entry.ssoProvider).toBe('google')
    expect(entry.excludeFromAnalytics).toBe(true)
    expect(toCreatePayload(entry, null)).toMatchObject({
      password: '',
      ssoProvider: 'google',
      ssoLabel: '',
      excludeFromAnalytics: true,
    })
  })

  it('writes an SSO link as the linked entry name and leaves the id for the import pass', () => {
    const linked: VaultEntry = {
      ...(password as Extract<VaultEntry, { type: 'password' }>),
      id: '9',
      name: 'Google',
    }
    const sso: VaultEntry = {
      ...(password as Extract<VaultEntry, { type: 'password' }>),
      id: '10',
      name: 'Figma',
      password: '',
      ssoProvider: 'google',
      ssoEntryId: '9',
    }

    const payload = buildPayload([linked, sso], [], lookup)
    const written = payload.entries.at(1)
    expect(written?.type === 'password' && written.ssoEntry).toBe('Google')

    const parsed = parseBackupFile(JSON.stringify({ ...blankFile, payload }))
    if (parsed.encrypted) throw new Error('expected a plaintext file')

    const restored = parsed.payload.entries.at(1)
    if (!restored || restored.type !== 'password') throw new Error('expected a password entry')

    expect(restored.ssoEntry).toBe('Google')
    // Ids mean nothing across accounts, so the link is resolved by name after every entry exists
    expect(toCreatePayload(restored, null)).toMatchObject({ ssoEntryId: null })
  })

  it('maps a backup entry back to a create payload', () => {
    const [entry] = buildPayload([note], [], lookup).entries
    if (!entry) throw new Error('expected an entry')

    expect(toCreatePayload(entry, 'cat-9')).toEqual({
      type: 'note',
      name: 'Recovery codes',
      content: 'abc-def',
      color: 'bg-red-600',
      icon: 'note',
      categoryId: 'cat-9',
    })
  })
})

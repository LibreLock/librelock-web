import { describe, it, expect } from 'vitest'
import { detectBrandIcon, resolveEntryIcon, getIcon, ICON_MAP } from './catalog'

describe('detectBrandIcon', () => {
  it('matches by exact URL host', () => {
    expect(detectBrandIcon('My login', 'https://accounts.google.com')?.id).toBe('google')
  })

  it('matches by bare host without scheme', () => {
    expect(detectBrandIcon('', 'github.com')?.id).toBe('github')
  })

  it('strips www and matches subdomains', () => {
    expect(detectBrandIcon('', 'https://www.facebook.com/foo')?.id).toBe('facebook')
  })

  it('treats twitter.com as X', () => {
    expect(detectBrandIcon('', 'twitter.com')?.id).toBe('x')
  })

  it('matches by name when no URL is given', () => {
    expect(detectBrandIcon('Instagram')?.id).toBe('instagram')
  })

  it('matches a brand keyword inside a longer name', () => {
    expect(detectBrandIcon('Work GitHub account')?.id).toBe('github')
  })

  it('lets the URL win over the name', () => {
    expect(detectBrandIcon('My Netflix note', 'https://spotify.com')?.id).toBe('spotify')
  })

  it('returns null for unknown entries', () => {
    expect(detectBrandIcon('Home router', 'https://192.168.1.1')).toBeNull()
    expect(detectBrandIcon('')).toBeNull()
  })
})

describe('resolveEntryIcon', () => {
  it('prefers an explicitly chosen icon over detection', () => {
    expect(resolveEntryIcon('Google', 'bank', 'google.com')?.id).toBe('bank')
  })

  it('falls back to detection when no icon is chosen', () => {
    expect(resolveEntryIcon('Google', null, 'google.com')?.id).toBe('google')
  })

  it('returns null (letter fallback) when nothing matches', () => {
    expect(resolveEntryIcon('Router', null)).toBeNull()
  })

  it('ignores an unknown chosen id and still detects', () => {
    expect(resolveEntryIcon('Google', 'does-not-exist', 'google.com')?.id).toBe('google')
  })
})

describe('catalog integrity', () => {
  it('every catalog icon renders at least one non-empty path', () => {
    for (const icon of Object.values(ICON_MAP)) {
      expect(icon.paths.length).toBeGreaterThan(0)
      expect(icon.paths.every((p) => p.length > 0)).toBe(true)
    }
  })

  it('getIcon resolves known ids and rejects unknown ones', () => {
    expect(getIcon('bank')?.label).toBe('Bank')
    expect(getIcon('nope')).toBeNull()
    expect(getIcon(null)).toBeNull()
  })

  it('has no Teams icon', () => {
    expect(getIcon('teams')).toBeNull()
    expect(detectBrandIcon('Teams', 'https://teams.microsoft.com')?.id).not.toBe('teams')
  })

  it('gives the Google glyph a fattening stroke', () => {
    expect(getIcon('google')?.strokeWidth).toBeGreaterThan(0)
  })
})

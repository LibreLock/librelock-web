import { describe, expect, it } from 'vitest'
import { getSsoProvider, ssoLabel, suggestSsoProvider } from '@/services/sso'

describe('suggestSsoProvider', () => {
  it('maps a provider-owned email domain to its provider', () => {
    expect(suggestSsoProvider('lan@gmail.com')).toBe('google')
    expect(suggestSsoProvider('lan@googlemail.com')).toBe('google')
    expect(suggestSsoProvider('lan@OUTLOOK.COM')).toBe('microsoft')
    expect(suggestSsoProvider('lan@me.com')).toBe('apple')
  })

  it('falls back to an email-shaped username', () => {
    expect(suggestSsoProvider('', 'lan@icloud.com')).toBe('apple')
  })

  it('suggests nothing for an ordinary or malformed address', () => {
    expect(suggestSsoProvider('lan@example.com')).toBeNull()
    expect(suggestSsoProvider('lan')).toBeNull()
    expect(suggestSsoProvider('lan@')).toBeNull()
    expect(suggestSsoProvider('')).toBeNull()
  })
})

describe('ssoLabel', () => {
  it('prefers the custom name, then the provider, then the raw id', () => {
    expect(ssoLabel('other', ' Corp IdP ')).toBe('Corp IdP')
    expect(ssoLabel('google')).toBe('Google')
    // An id from an import or a newer release still renders as itself
    expect(getSsoProvider('keycloak')).toBeNull()
    expect(ssoLabel('keycloak')).toBe('keycloak')
  })
})

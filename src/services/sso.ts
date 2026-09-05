export interface SsoProvider {
  id: string
  label: string
  icon: string | null
}

export const SSO_PROVIDERS: SsoProvider[] = [
  { id: 'google', label: 'Google', icon: 'google' },
  { id: 'microsoft', label: 'Microsoft', icon: 'microsoft' },
  { id: 'apple', label: 'Apple', icon: 'apple' },
  { id: 'github', label: 'GitHub', icon: 'github' },
  { id: 'gitlab', label: 'GitLab', icon: 'gitlab' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  { id: 'x', label: 'X', icon: 'x' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { id: 'discord', label: 'Discord', icon: 'discord' },
  { id: 'slack', label: 'Slack', icon: 'slack' },
  { id: 'okta', label: 'Okta', icon: 'okta' },
  { id: 'saml', label: 'SAML / company SSO', icon: 'work' },
  { id: 'other', label: 'Other', icon: null },
]

export const SSO_OTHER = 'other'

export function getSsoProvider(id: string | null | undefined): SsoProvider | null {
  if (!id) return null
  return SSO_PROVIDERS.find((p) => p.id === id) ?? null
}

export function ssoLabel(providerId: string | null | undefined, custom = ''): string {
  const trimmed = custom.trim()
  if (trimmed) return trimmed
  return getSsoProvider(providerId)?.label ?? providerId ?? ''
}

export function ssoIcon(providerId: string | null | undefined): string | null {
  return getSsoProvider(providerId)?.icon ?? null
}

const DOMAIN_PROVIDERS: Record<string, string> = {
  'gmail.com': 'google',
  'googlemail.com': 'google',
  'outlook.com': 'microsoft',
  'hotmail.com': 'microsoft',
  'live.com': 'microsoft',
  'msn.com': 'microsoft',
  'icloud.com': 'apple',
  'me.com': 'apple',
}

function domainOf(address: string): string | null {
  const at = address.trim().toLowerCase().lastIndexOf('@')
  if (at === -1) return null
  const domain = address
    .trim()
    .toLowerCase()
    .slice(at + 1)
  return domain.length > 0 ? domain : null
}

export function suggestSsoProvider(email: string, username = ''): string | null {
  for (const address of [email, username]) {
    const domain = domainOf(address ?? '')
    if (domain && DOMAIN_PROVIDERS[domain]) return DOMAIN_PROVIDERS[domain]
  }
  return null
}

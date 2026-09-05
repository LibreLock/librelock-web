const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:']
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

export function externalHref(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''

  const candidate = HAS_SCHEME.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(candidate)
    return SAFE_PROTOCOLS.includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

/**
 * The value shown to the user for an entry URL. Scheme and "www." are noise in a list -
 * "github.com" reads better than "https://www.github.com/" - so both go, along with a bare
 * trailing slash. Anything unparseable is echoed back trimmed rather than hidden.
 */
export function displayUrl(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''

  const bare = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./i, '')
  return bare.replace(/\/+$/, '') || bare
}

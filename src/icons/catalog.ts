import {
  siGoogle,
  siGmail,
  siYoutube,
  siFacebook,
  siMessenger,
  siInstagram,
  siThreads,
  siWhatsapp,
  siX,
  siTiktok,
  siSnapchat,
  siPinterest,
  siReddit,
  siDiscord,
  siTelegram,
  siSignal,
  siMastodon,
  siViber,
  siLine,
  siWechat,
  siZoom,
  siGithub,
  siGitlab,
  siBitbucket,
  siApple,
  siGooglechrome,
  siFirefox,
  siCloudflare,
  siVercel,
  siNetlify,
  siDigitalocean,
  siDocker,
  siNotion,
  siFigma,
  siWordpress,
  siAtlassian,
  siJira,
  siTrello,
  siNetflix,
  siSpotify,
  siApplemusic,
  siTwitch,
  siSteam,
  siPaypal,
  siStripe,
  siWise,
  siRevolut,
  siCoinbase,
  siBinance,
  siRobinhood,
  siN26,
  siGoogledrive,
  siGooglecloud,
  siGooglemeet,
  siGooglegemini,
  siProtonmail,
  siProton,
  siProtonvpn,
  siNordvpn,
  siIcloud,
  siEbay,
  siAirbnb,
  siUber,
  siDropbox,
  siAnthropic,
  siClaude,
  type SimpleIcon,
} from 'simple-icons'

export type IconMode = 'fill' | 'stroke'
export type IconGroup = 'Brands' | 'General'

export interface CatalogIcon {
  id: string
  label: string
  group: IconGroup
  mode: IconMode
  /** One or more SVG path `d` values, rendered inside a 0 0 24 24 viewBox. */
  paths: string[]
  /** Fill rule for `fill` mode; use 'evenodd' for glyphs with punched-out holes. */
  fillRule?: 'nonzero' | 'evenodd'
  /** For `fill` mode: stroke the glyph in the same colour to make it visually heavier. */
  strokeWidth?: number
  /** Lowercase tokens matched against an entry name for auto-detection. */
  keywords: string[]
  /** Bare domains (no scheme / www) matched against an entry URL for auto-detection. */
  domains: string[]
}

function brand(
  id: string,
  icon: SimpleIcon,
  domains: string[],
  extraKeywords: string[] = [],
): CatalogIcon {
  const title = icon.title.toLowerCase()
  return {
    id,
    label: icon.title,
    group: 'Brands',
    mode: 'fill',
    paths: [icon.path],
    keywords: Array.from(new Set([id, title, ...extraKeywords])),
    domains,
  }
}

// LinkedIn and Microsoft are excluded from simple-icons for trademark reasons but are common enough to warrant hand-authored glyphs
const LINKEDIN: CatalogIcon = {
  id: 'linkedin',
  label: 'LinkedIn',
  group: 'Brands',
  mode: 'fill',
  paths: [
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  ],
  keywords: ['linkedin'],
  domains: ['linkedin.com'],
}

const MICROSOFT: CatalogIcon = {
  id: 'microsoft',
  label: 'Microsoft',
  group: 'Brands',
  mode: 'fill',
  paths: [
    'M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z',
  ],
  keywords: ['microsoft', 'outlook', 'office', 'onedrive', 'azure', 'windows'],
  domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'azure.com'],
}

// simple-icons ships a thin Google "G"; stroke it to match the visual weight of the other brand glyphs
const GOOGLE: CatalogIcon = {
  ...brand('google', siGoogle, ['google.com'], ['search']),
  strokeWidth: 1.1,
}

const BRANDS: CatalogIcon[] = [
  GOOGLE,
  brand('gmail', siGmail, ['mail.google.com'], ['email']),
  brand('youtube', siYoutube, ['youtube.com', 'youtu.be']),
  brand('facebook', siFacebook, ['facebook.com', 'fb.com'], ['meta']),
  brand('messenger', siMessenger, ['messenger.com']),
  brand('instagram', siInstagram, ['instagram.com'], ['insta']),
  brand('threads', siThreads, ['threads.net']),
  brand('whatsapp', siWhatsapp, ['whatsapp.com']),
  brand('x', siX, ['x.com', 'twitter.com'], ['twitter']),
  brand('tiktok', siTiktok, ['tiktok.com']),
  brand('snapchat', siSnapchat, ['snapchat.com'], ['snap']),
  brand('pinterest', siPinterest, ['pinterest.com']),
  brand('reddit', siReddit, ['reddit.com']),
  brand('discord', siDiscord, ['discord.com', 'discord.gg']),
  brand('telegram', siTelegram, ['telegram.org', 't.me']),
  brand('signal', siSignal, ['signal.org']),
  brand('mastodon', siMastodon, ['mastodon.social', 'joinmastodon.org']),
  LINKEDIN,
  brand('viber', siViber, ['viber.com']),
  brand('line', siLine, ['line.me']),
  brand('wechat', siWechat, ['wechat.com', 'weixin.qq.com'], ['weixin']),
  brand('zoom', siZoom, ['zoom.us', 'zoom.com']),
  brand('github', siGithub, ['github.com']),
  brand('gitlab', siGitlab, ['gitlab.com']),
  brand('bitbucket', siBitbucket, ['bitbucket.org']),
  brand('apple', siApple, ['apple.com', 'appleid.apple.com'], ['appleid']),
  brand('icloud', siIcloud, ['icloud.com']),
  brand('applemusic', siApplemusic, ['music.apple.com']),
  MICROSOFT,
  brand('googlechrome', siGooglechrome, [], ['chrome']),
  brand('firefox', siFirefox, ['mozilla.org', 'firefox.com'], ['mozilla']),
  brand('cloudflare', siCloudflare, ['cloudflare.com']),
  brand('vercel', siVercel, ['vercel.com']),
  brand('netlify', siNetlify, ['netlify.com', 'netlify.app']),
  brand('digitalocean', siDigitalocean, ['digitalocean.com']),
  brand('docker', siDocker, ['docker.com', 'hub.docker.com']),
  brand('notion', siNotion, ['notion.so', 'notion.com']),
  brand('figma', siFigma, ['figma.com']),
  brand('wordpress', siWordpress, ['wordpress.com', 'wordpress.org']),
  brand('atlassian', siAtlassian, ['atlassian.com', 'atlassian.net']),
  brand('jira', siJira, ['jira.com']),
  brand('trello', siTrello, ['trello.com']),
  brand('dropbox', siDropbox, ['dropbox.com']),
  brand('googledrive', siGoogledrive, ['drive.google.com'], ['gdrive']),
  brand('googlecloud', siGooglecloud, ['cloud.google.com'], ['gcp']),
  brand('googlemeet', siGooglemeet, ['meet.google.com']),
  brand('googlegemini', siGooglegemini, ['gemini.google.com'], ['gemini', 'bard']),
  brand('anthropic', siAnthropic, ['anthropic.com']),
  brand('claude', siClaude, ['claude.ai']),
  brand('netflix', siNetflix, ['netflix.com']),
  brand('spotify', siSpotify, ['spotify.com']),
  brand('twitch', siTwitch, ['twitch.tv']),
  brand('steam', siSteam, ['steampowered.com', 'steamcommunity.com']),
  brand('paypal', siPaypal, ['paypal.com']),
  brand('stripe', siStripe, ['stripe.com']),
  brand('wise', siWise, ['wise.com'], ['transferwise']),
  brand('revolut', siRevolut, ['revolut.com']),
  brand('coinbase', siCoinbase, ['coinbase.com']),
  brand('binance', siBinance, ['binance.com']),
  brand('robinhood', siRobinhood, ['robinhood.com']),
  brand('n26', siN26, ['n26.com']),
  brand('protonmail', siProtonmail, ['mail.proton.me', 'protonmail.com'], ['proton mail']),
  brand('proton', siProton, ['proton.me']),
  brand('protonvpn', siProtonvpn, ['protonvpn.com']),
  brand('nordvpn', siNordvpn, ['nordvpn.com'], ['nord']),
  brand('ebay', siEbay, ['ebay.com']),
  brand('airbnb', siAirbnb, ['airbnb.com']),
  brand('uber', siUber, ['uber.com']),
]

// Generic, non-brand icons (Heroicons-style outline glyphs) for categorising entries
const GENERAL: CatalogIcon[] = [
  {
    id: 'bank',
    label: 'Bank',
    group: 'General',
    mode: 'stroke',
    paths: ['M3 21h18M5 21V10m14 11V10M4 10l8-6 8 6M9 21v-6a3 3 0 016 0v6'],
    keywords: ['bank', 'banking'],
    domains: [],
  },
  {
    id: 'mail',
    label: 'Mail',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    ],
    keywords: ['mail', 'email'],
    domains: [],
  },
  {
    id: 'card',
    label: 'Card',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    ],
    keywords: ['card', 'credit'],
    domains: [],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    ],
    keywords: ['shopping', 'shop', 'store'],
    domains: [],
  },
  {
    id: 'social',
    label: 'Social',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M17 20h5v-2a4 4 0 00-3-3.87M9 20H2v-2a4 4 0 013-3.87m10-2.13a4 4 0 10-6 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    ],
    keywords: ['social'],
    domains: [],
  },
  {
    id: 'chat',
    label: 'Chat',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.72 7.72 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    ],
    keywords: ['chat', 'message', 'messaging'],
    domains: [],
  },
  {
    id: 'globe',
    label: 'Website',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    ],
    keywords: ['website', 'web', 'globe', 'internet'],
    domains: [],
  },
  {
    id: 'work',
    label: 'Work',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    ],
    keywords: ['work', 'job', 'business', 'office'],
    domains: [],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    ],
    keywords: ['cloud', 'storage'],
    domains: [],
  },
  {
    id: 'wifi',
    label: 'Network',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
    ],
    keywords: ['wifi', 'network', 'router', 'vpn'],
    domains: [],
  },
  {
    id: 'game',
    label: 'Gaming',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M6 12h4m-2-2v4m5-2h.01M17 11h.01M7 20a4 4 0 01-4-4l1.2-6a3 3 0 012.95-2.4h9.7A3 3 0 0119.8 10L21 16a4 4 0 01-4 4c-1.5 0-2-.5-3-1.5S12.5 17 12 17s-1 .5-2 1.5S8.5 20 7 20z',
    ],
    keywords: ['game', 'gaming', 'games'],
    domains: [],
  },
  {
    id: 'key',
    label: 'Key',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    ],
    keywords: ['key', 'login', 'password'],
    domains: [],
  },
  {
    id: 'shield',
    label: 'Security',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    ],
    keywords: ['shield', 'security', 'secure', 'auth'],
    domains: [],
  },
  {
    id: 'server',
    label: 'Server',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m0 0H5m14 0a2 2 0 012 2v0a2 2 0 01-2 2H5a2 2 0 01-2-2v0a2 2 0 012-2m14-4h.01M17 16h.01',
    ],
    keywords: ['server', 'database', 'hosting', 'ssh'],
    domains: [],
  },
  {
    id: 'star',
    label: 'Star',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    ],
    keywords: ['star', 'favorite'],
    domains: [],
  },
  {
    id: 'heart',
    label: 'Heart',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    ],
    keywords: ['heart', 'health'],
    domains: [],
  },
]

export const ICON_CATALOG: CatalogIcon[] = [...BRANDS, ...GENERAL]

export const ICON_MAP: Record<string, CatalogIcon> = Object.fromEntries(
  ICON_CATALOG.map((icon) => [icon.id, icon]),
)

export function getIcon(id: string | null | undefined): CatalogIcon | null {
  if (!id) return null
  return ICON_MAP[id] ?? null
}

function hostFromUrl(url: string): string | null {
  const raw = url.trim().toLowerCase()
  if (!raw) return null
  // Tolerate bare hosts ("github.com") as well as full URLs
  const withScheme = /^[a-z]+:\/\//.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

/**
 * Best-effort brand detection from an entry's name and/or URL. URL matches win
 * over name matches. Returns null when nothing recognisable is found.
 */
export function detectBrandIcon(name: string, url?: string): CatalogIcon | null {
  const host = url ? hostFromUrl(url) : null
  if (host) {
    for (const brandIcon of BRANDS) {
      if (brandIcon.domains.some((d) => matchesDomain(host, d))) return brandIcon
    }
  }

  const n = name.trim().toLowerCase()
  if (n) {
    for (const brandIcon of BRANDS) {
      if (brandIcon.keywords.includes(n)) return brandIcon
    }
    for (const brandIcon of BRANDS) {
      if (
        brandIcon.keywords.some(
          (k) => k.length >= 3 && new RegExp(`\\b${escapeRegExp(k)}\\b`).test(n),
        )
      ) {
        return brandIcon
      }
    }
  }

  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resolves the icon to render for an entry: an explicitly chosen icon takes
 * precedence, otherwise fall back to brand auto-detection. Null means "render
 * the name's first letter".
 */
export function resolveEntryIcon(
  name: string,
  chosenId?: string | null,
  url?: string,
): CatalogIcon | null {
  return getIcon(chosenId) ?? detectBrandIcon(name, url)
}

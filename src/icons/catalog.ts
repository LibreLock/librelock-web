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
  siGooglephotos,
  siGooglecalendar,
  siGoogleplay,
  siYoutubemusic,
  siGoogleauthenticator,
  siEvernote,
  siObsidian,
  siAsana,
  siClickup,
  siLinear,
  siMiro,
  siRailway,
  siRender,
  siSupabase,
  siFirebase,
  siPostgresql,
  siMysql,
  siMongodb,
  siRedis,
  siKubernetes,
  siPython,
  siNodedotjs,
  siGodaddy,
  siNamecheap,
  siHetzner,
  siOvh,
  siMastercard,
  siVisa,
  siAmericanexpress,
  siKlarna,
  siMonzo,
  siSquare,
  siVenmo,
  siCashapp,
  si1password,
  siBitwarden,
  siLastpass,
  siYubico,
  siKeepassxc,
  siAuth0,
  siOkta,
  siPerplexity,
  siHuggingface,
  siNvidia,
  siSamsung,
  siSony,
  siDell,
  siLenovo,
  siAsus,
  siPlaystation,
  siEpicgames,
  siRoblox,
  siHbo,
  siCrunchyroll,
  siSoundcloud,
  siDeezer,
  siTidal,
  siAudible,
  siPlex,
  siJellyfin,
  siBandcamp,
  siImdb,
  siLetterboxd,
  siGoodreads,
  siWikipedia,
  siMedium,
  siSubstack,
  siQuora,
  siStackoverflow,
  siDuolingo,
  siCoursera,
  siUdemy,
  siPatreon,
  siUpwork,
  siFiverr,
  siFreelancer,
  siMatrix,
  siElement,
  siTripadvisor,
  siLyft,
  siDoordash,
  siAliexpress,
  siEtsy,
  siFedex,
  siUps,
  siDhl,
  siRyanair,
  siAmericanairlines,
  siDelta,
  siMcdonalds,
  siStarbucks,
  siInstacart,
  siRakuten,
  siZalando,
  siProtondrive,
  siProtoncalendar,
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
  brand('googlephotos', siGooglephotos, ['photos.google.com']),
  brand('googlecalendar', siGooglecalendar, ['calendar.google.com']),
  brand('googleplay', siGoogleplay, ['play.google.com']),
  brand('youtubemusic', siYoutubemusic, ['music.youtube.com']),
  brand('googleauthenticator', siGoogleauthenticator, [], ['2fa', 'authenticator', 'otp']),
  brand('evernote', siEvernote, ['evernote.com']),
  brand('obsidian', siObsidian, ['obsidian.md']),
  brand('asana', siAsana, ['asana.com']),
  brand('clickup', siClickup, ['clickup.com']),
  brand('linear', siLinear, ['linear.app']),
  brand('miro', siMiro, ['miro.com']),
  brand('railway', siRailway, ['railway.app', 'railway.com']),
  brand('render', siRender, ['render.com']),
  brand('supabase', siSupabase, ['supabase.com']),
  brand('firebase', siFirebase, ['firebase.google.com']),
  brand('postgresql', siPostgresql, ['postgresql.org'], ['postgres']),
  brand('mysql', siMysql, ['mysql.com']),
  brand('mongodb', siMongodb, ['mongodb.com'], ['mongo']),
  brand('redis', siRedis, ['redis.io', 'redis.com']),
  brand('kubernetes', siKubernetes, ['kubernetes.io'], ['k8s']),
  brand('python', siPython, ['python.org', 'pypi.org']),
  brand('nodedotjs', siNodedotjs, ['nodejs.org'], ['node', 'nodejs', 'npm']),
  brand('godaddy', siGodaddy, ['godaddy.com']),
  brand('namecheap', siNamecheap, ['namecheap.com']),
  brand('hetzner', siHetzner, ['hetzner.com', 'hetzner.cloud']),
  brand('ovh', siOvh, ['ovh.com', 'ovhcloud.com']),
  brand('mastercard', siMastercard, ['mastercard.com']),
  brand('visa', siVisa, ['visa.com']),
  brand('americanexpress', siAmericanexpress, ['americanexpress.com'], ['amex']),
  brand('klarna', siKlarna, ['klarna.com']),
  brand('monzo', siMonzo, ['monzo.com']),
  brand('square', siSquare, ['squareup.com']),
  brand('venmo', siVenmo, ['venmo.com']),
  brand('cashapp', siCashapp, ['cash.app'], ['cash app']),
  brand('1password', si1password, ['1password.com'], ['onepassword']),
  brand('bitwarden', siBitwarden, ['bitwarden.com']),
  brand('lastpass', siLastpass, ['lastpass.com']),
  brand('yubico', siYubico, ['yubico.com'], ['yubikey']),
  brand('keepassxc', siKeepassxc, ['keepassxc.org'], ['keepass']),
  brand('auth0', siAuth0, ['auth0.com']),
  brand('okta', siOkta, ['okta.com']),
  brand('perplexity', siPerplexity, ['perplexity.ai']),
  brand('huggingface', siHuggingface, ['huggingface.co'], ['hugging face']),
  brand('nvidia', siNvidia, ['nvidia.com']),
  brand('samsung', siSamsung, ['samsung.com']),
  brand('sony', siSony, ['sony.com']),
  brand('dell', siDell, ['dell.com']),
  brand('lenovo', siLenovo, ['lenovo.com']),
  brand('asus', siAsus, ['asus.com']),
  brand('playstation', siPlaystation, ['playstation.com'], ['psn']),
  brand('epicgames', siEpicgames, ['epicgames.com'], ['epic games']),
  brand('roblox', siRoblox, ['roblox.com']),
  brand('hbo', siHbo, ['hbomax.com', 'max.com'], ['hbo max']),
  brand('crunchyroll', siCrunchyroll, ['crunchyroll.com']),
  brand('soundcloud', siSoundcloud, ['soundcloud.com']),
  brand('deezer', siDeezer, ['deezer.com']),
  brand('tidal', siTidal, ['tidal.com']),
  brand('audible', siAudible, ['audible.com']),
  brand('plex', siPlex, ['plex.tv']),
  brand('jellyfin', siJellyfin, ['jellyfin.org']),
  brand('bandcamp', siBandcamp, ['bandcamp.com']),
  brand('imdb', siImdb, ['imdb.com']),
  brand('letterboxd', siLetterboxd, ['letterboxd.com']),
  brand('goodreads', siGoodreads, ['goodreads.com']),
  brand('wikipedia', siWikipedia, ['wikipedia.org']),
  brand('medium', siMedium, ['medium.com']),
  brand('substack', siSubstack, ['substack.com']),
  brand('quora', siQuora, ['quora.com']),
  brand('stackoverflow', siStackoverflow, ['stackoverflow.com'], ['stack overflow']),
  brand('duolingo', siDuolingo, ['duolingo.com']),
  brand('coursera', siCoursera, ['coursera.org']),
  brand('udemy', siUdemy, ['udemy.com']),
  brand('patreon', siPatreon, ['patreon.com']),
  brand('upwork', siUpwork, ['upwork.com']),
  brand('fiverr', siFiverr, ['fiverr.com']),
  brand('freelancer', siFreelancer, ['freelancer.com']),
  brand('matrix', siMatrix, ['matrix.org']),
  brand('element', siElement, ['element.io']),
  brand('tripadvisor', siTripadvisor, ['tripadvisor.com']),
  brand('lyft', siLyft, ['lyft.com']),
  brand('doordash', siDoordash, ['doordash.com']),
  brand('aliexpress', siAliexpress, ['aliexpress.com']),
  brand('etsy', siEtsy, ['etsy.com']),
  brand('fedex', siFedex, ['fedex.com']),
  brand('ups', siUps, ['ups.com']),
  brand('dhl', siDhl, ['dhl.com']),
  brand('ryanair', siRyanair, ['ryanair.com']),
  brand('americanairlines', siAmericanairlines, ['aa.com'], ['american airlines']),
  brand('delta', siDelta, ['delta.com']),
  brand('mcdonalds', siMcdonalds, ['mcdonalds.com'], ['mcdonalds']),
  brand('starbucks', siStarbucks, ['starbucks.com']),
  brand('instacart', siInstacart, ['instacart.com']),
  brand('rakuten', siRakuten, ['rakuten.com']),
  brand('zalando', siZalando, ['zalando.com']),
  brand('protondrive', siProtondrive, ['drive.proton.me'], ['proton drive']),
  brand('protoncalendar', siProtoncalendar, ['calendar.proton.me'], ['proton calendar']),
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
  {
    id: 'home',
    label: 'Home',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    ],
    keywords: ['home', 'house', 'family'],
    domains: [],
  },
  {
    id: 'user',
    label: 'Person',
    group: 'General',
    mode: 'stroke',
    paths: ['M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'],
    keywords: ['user', 'person', 'profile', 'account'],
    domains: [],
  },
  {
    id: 'folder',
    label: 'Folder',
    group: 'General',
    mode: 'stroke',
    paths: ['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'],
    keywords: ['folder', 'files', 'directory'],
    domains: [],
  },
  {
    id: 'document',
    label: 'Document',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    ],
    keywords: ['document', 'file', 'note', 'doc'],
    domains: [],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    ],
    keywords: ['calendar', 'date', 'schedule', 'event'],
    domains: [],
  },
  {
    id: 'camera',
    label: 'Camera',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
      'M15 13a3 3 0 11-6 0 3 3 0 016 0z',
    ],
    keywords: ['camera', 'photo', 'photos'],
    domains: [],
  },
  {
    id: 'music',
    label: 'Music',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
    ],
    keywords: ['music', 'audio', 'song'],
    domains: [],
  },
  {
    id: 'location',
    label: 'Location',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
      'M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    ],
    keywords: ['location', 'map', 'address', 'place'],
    domains: [],
  },
  {
    id: 'book',
    label: 'Book',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    ],
    keywords: ['book', 'reading', 'library', 'education'],
    domains: [],
  },
  {
    id: 'lock',
    label: 'Lock',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    ],
    keywords: ['lock', 'private', 'secret', 'vault'],
    domains: [],
  },
  {
    id: 'code',
    label: 'Code',
    group: 'General',
    mode: 'stroke',
    paths: ['M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'],
    keywords: ['code', 'dev', 'developer', 'api'],
    domains: [],
  },
  {
    id: 'phone',
    label: 'Phone',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    ],
    keywords: ['phone', 'call', 'mobile', 'contact'],
    domains: [],
  },
  {
    id: 'gift',
    label: 'Gift',
    group: 'General',
    mode: 'stroke',
    paths: [
      'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
    ],
    keywords: ['gift', 'reward', 'present', 'voucher'],
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

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
  siStrava,
  siFitbit,
  siGarmin,
  siDuckduckgo,
  siBrave,
  siGooglemaps,
  siBookingdotcom,
  siExpedia,
  siShopify,
  siMailchimp,
  siAirtable,
  siZapier,
  siVimeo,
  siHomeassistant,
  siNextcloud,
  type SimpleIcon,
} from 'simple-icons'

export type IconMode = 'fill' | 'stroke'
export type IconGroup = 'Brands' | 'General'

export interface CatalogIcon {
  id: string
  label: string
  group: IconGroup
  mode: IconMode
  /** One or more SVG path `d` values, rendered inside `viewBox` (0 0 24 24 unless given). */
  paths: string[]
  viewBox?: string
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

// LinkedIn, Slack and Microsoft are excluded from simple-icons for trademark reasons but are common enough to warrant hand-authored glyphs
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

const SLACK: CatalogIcon = {
  id: 'slack',
  label: 'Slack',
  group: 'Brands',
  mode: 'fill',
  paths: [
    'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
  ],
  keywords: ['slack'],
  domains: ['slack.com'],
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
  SLACK,
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
  brand('strava', siStrava, ['strava.com']),
  brand('fitbit', siFitbit, ['fitbit.com']),
  brand('garmin', siGarmin, ['garmin.com', 'connect.garmin.com']),
  brand('duckduckgo', siDuckduckgo, ['duckduckgo.com'], ['ddg']),
  brand('brave', siBrave, ['brave.com']),
  brand('googlemaps', siGooglemaps, ['maps.google.com'], ['google maps', 'maps']),
  brand('bookingdotcom', siBookingdotcom, ['booking.com'], ['booking']),
  brand('expedia', siExpedia, ['expedia.com']),
  brand('shopify', siShopify, ['shopify.com', 'myshopify.com']),
  brand('mailchimp', siMailchimp, ['mailchimp.com']),
  brand('airtable', siAirtable, ['airtable.com']),
  brand('zapier', siZapier, ['zapier.com']),
  brand('vimeo', siVimeo, ['vimeo.com']),
  brand('homeassistant', siHomeassistant, ['home-assistant.io'], ['home assistant', 'hass']),
  brand('nextcloud', siNextcloud, ['nextcloud.com']),
]

// Generic, non-brand icons for categorising entries: Phosphor's regular weight on its 256 grid,
// the same set the rest of the interface uses
const GENERAL: CatalogIcon[] = [
  {
    id: 'bank',
    label: 'Bank',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z',
    ],
    keywords: ['bank', 'banking'],
    domains: [],
  },
  {
    id: 'mail',
    label: 'Mail',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z',
    ],
    keywords: ['mail', 'email'],
    domains: [],
  },
  {
    id: 'card',
    label: 'Card',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,16V88H32V64Zm0,128H32V104H224v88Zm-16-24a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h32A8,8,0,0,1,208,168Zm-64,0a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h16A8,8,0,0,1,144,168Z',
    ],
    keywords: ['card', 'credit'],
    domains: [],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z',
    ],
    keywords: ['shopping', 'shop', 'store'],
    domains: [],
  },
  {
    id: 'social',
    label: 'Social',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z',
    ],
    keywords: ['social'],
    domains: [],
  },
  {
    id: 'chat',
    label: 'Chat',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z',
    ],
    keywords: ['chat', 'message', 'messaging'],
    domains: [],
  },
  {
    id: 'globe',
    label: 'Website',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm88,104a87.61,87.61,0,0,1-3.33,24H174.16a157.44,157.44,0,0,0,0-48h38.51A87.61,87.61,0,0,1,216,128ZM102,168H154a115.11,115.11,0,0,1-26,45A115.27,115.27,0,0,1,102,168Zm-3.9-16a140.84,140.84,0,0,1,0-48h59.88a140.84,140.84,0,0,1,0,48ZM40,128a87.61,87.61,0,0,1,3.33-24H81.84a157.44,157.44,0,0,0,0,48H43.33A87.61,87.61,0,0,1,40,128ZM154,88H102a115.11,115.11,0,0,1,26-45A115.27,115.27,0,0,1,154,88Zm52.33,0H170.71a135.28,135.28,0,0,0-22.3-45.6A88.29,88.29,0,0,1,206.37,88ZM107.59,42.4A135.28,135.28,0,0,0,85.29,88H49.63A88.29,88.29,0,0,1,107.59,42.4ZM49.63,168H85.29a135.28,135.28,0,0,0,22.3,45.6A88.29,88.29,0,0,1,49.63,168Zm98.78,45.6a135.28,135.28,0,0,0,22.3-45.6h35.66A88.29,88.29,0,0,1,148.41,213.6Z',
    ],
    keywords: ['website', 'web', 'globe', 'internet'],
    domains: [],
  },
  {
    id: 'work',
    label: 'Work',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72Zm0,128H40V131.64A200.19,200.19,0,0,0,128,152a200.25,200.25,0,0,0,88-20.37V200ZM104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112Z',
    ],
    keywords: ['work', 'job', 'business', 'office'],
    domains: [],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Z',
    ],
    keywords: ['cloud', 'storage'],
    domains: [],
  },
  {
    id: 'wifi',
    label: 'Network',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204ZM237.08,87A172,172,0,0,0,18.92,87,8,8,0,0,0,29.08,99.37a156,156,0,0,1,197.84,0A8,8,0,0,0,237.08,87ZM205,122.77a124,124,0,0,0-153.94,0A8,8,0,0,0,61,135.31a108,108,0,0,1,134.06,0,8,8,0,0,0,11.24-1.3A8,8,0,0,0,205,122.77Zm-32.26,35.76a76.05,76.05,0,0,0-89.42,0,8,8,0,0,0,9.42,12.94,60,60,0,0,1,70.58,0,8,8,0,1,0,9.42-12.94Z',
    ],
    keywords: ['wifi', 'network', 'router', 'vpn'],
    domains: [],
  },
  {
    id: 'game',
    label: 'Gaming',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z',
    ],
    keywords: ['game', 'gaming', 'games'],
    domains: [],
  },
  {
    id: 'key',
    label: 'Key',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z',
    ],
    keywords: ['key', 'login', 'password'],
    domains: [],
  },
  {
    id: 'shield',
    label: 'Security',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z',
    ],
    keywords: ['shield', 'security', 'secure', 'auth'],
    domains: [],
  },
  {
    id: 'server',
    label: 'Server',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M208,136H48a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V152A16,16,0,0,0,208,136Zm0,64H48V152H208v48Zm0-160H48A16,16,0,0,0,32,56v48a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,64H48V56H208v48ZM192,80a12,12,0,1,1-12-12A12,12,0,0,1,192,80Zm0,96a12,12,0,1,1-12-12A12,12,0,0,1,192,176Z',
    ],
    keywords: ['server', 'database', 'hosting', 'ssh'],
    domains: [],
  },
  {
    id: 'star',
    label: 'Star',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M239.18,97.26A16.38,16.38,0,0,0,224.92,86l-59-4.76L143.14,26.15a16.36,16.36,0,0,0-30.27,0L90.11,81.23,31.08,86a16.46,16.46,0,0,0-9.37,28.86l45,38.83L53,211.75a16.38,16.38,0,0,0,24.5,17.82L128,198.49l50.53,31.08A16.4,16.4,0,0,0,203,211.75l-13.76-58.07,45-38.83A16.43,16.43,0,0,0,239.18,97.26Zm-15.34,5.47-48.7,42a8,8,0,0,0-2.56,7.91l14.88,62.8a.37.37,0,0,1-.17.48c-.18.14-.23.11-.38,0l-54.72-33.65a8,8,0,0,0-8.38,0L69.09,215.94c-.15.09-.19.12-.38,0a.37.37,0,0,1-.17-.48l14.88-62.8a8,8,0,0,0-2.56-7.91l-48.7-42c-.12-.1-.23-.19-.13-.5s.18-.27.33-.29l63.92-5.16A8,8,0,0,0,103,91.86l24.62-59.61c.08-.17.11-.25.35-.25s.27.08.35.25L153,91.86a8,8,0,0,0,6.75,4.92l63.92,5.16c.15,0,.24,0,.33.29S224,102.63,223.84,102.73Z',
    ],
    keywords: ['star', 'favorite'],
    domains: [],
  },
  {
    id: 'heart',
    label: 'Heart',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z',
    ],
    keywords: ['heart', 'health'],
    domains: [],
  },
  {
    id: 'home',
    label: 'Home',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z',
    ],
    keywords: ['home', 'house', 'family'],
    domains: [],
  },
  {
    id: 'user',
    label: 'Person',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z',
    ],
    keywords: ['user', 'person', 'profile', 'account'],
    domains: [],
  },
  {
    id: 'folder',
    label: 'Folder',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40ZM216,200H40V88H216Z',
    ],
    keywords: ['folder', 'files', 'directory'],
    domains: [],
  },
  {
    id: 'document',
    label: 'Document',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-32-80a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,136Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,168Z',
    ],
    keywords: ['document', 'file', 'note', 'doc'],
    domains: [],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z',
    ],
    keywords: ['calendar', 'date', 'schedule', 'event'],
    domains: [],
  },
  {
    id: 'camera',
    label: 'Camera',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z',
    ],
    keywords: ['camera', 'photo', 'photos'],
    domains: [],
  },
  {
    id: 'music',
    label: 'Music',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M212.92,17.69a8,8,0,0,0-6.86-1.45l-128,32A8,8,0,0,0,72,56V166.08A36,36,0,1,0,88,196V110.25l112-28v51.83A36,36,0,1,0,216,164V24A8,8,0,0,0,212.92,17.69ZM52,216a20,20,0,1,1,20-20A20,20,0,0,1,52,216ZM88,93.75V62.25l112-28v31.5ZM180,184a20,20,0,1,1,20-20A20,20,0,0,1,180,184Z',
    ],
    keywords: ['music', 'audio', 'song'],
    domains: [],
  },
  {
    id: 'location',
    label: 'Location',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z',
    ],
    keywords: ['location', 'map', 'address', 'place'],
    domains: [],
  },
  {
    id: 'book',
    label: 'Book',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-8,160H72a31.82,31.82,0,0,0-16,4.29V56A16,16,0,0,1,72,40H200Z',
    ],
    keywords: ['book', 'reading', 'library', 'education'],
    domains: [],
  },
  {
    id: 'lock',
    label: 'Lock',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z',
    ],
    keywords: ['lock', 'private', 'secret', 'vault'],
    domains: [],
  },
  {
    id: 'code',
    label: 'Code',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z',
    ],
    keywords: ['code', 'dev', 'developer', 'api'],
    domains: [],
  },
  {
    id: 'phone',
    label: 'Phone',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z',
    ],
    keywords: ['phone', 'call', 'mobile', 'contact'],
    domains: [],
  },
  {
    id: 'gift',
    label: 'Gift',
    group: 'General',
    mode: 'fill',
    viewBox: '0 0 256 256',
    paths: [
      'M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z',
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

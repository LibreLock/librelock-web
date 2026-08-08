export const APP_NAME = 'LibreLock'
// Same-origin by default: the dev server and the production nginx image both proxy /api to the backend, which keeps cookies first-party and CORS out of the picture
// Set VITE_API_BASE_URL at build time only when the API is served from a different origin
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
export const API_BASE_URL = configuredApiBaseUrl ? configuredApiBaseUrl : '/api'

// Version of this bundle; the server reports its own via GET /version
export const APP_VERSION = __APP_VERSION__

export const DB_NAME = 'librelock'
export const STORE = 'session'
export const KEY_ID = 'vault_key'
export const PRIVATE_KEY_ID = 'private_key'
export const ORG_KEY_ID = 'org_key'
// Per-tab random key that every stored key is wrapped under; dies with the tab, taking the usefulness of anything left in IndexedDB with it
export const SESSION_SECRET = 'vault_session_key'

export const KDF_ALGO = 'argon2id'
export const KDF_ITER = 4
export const KDF_MEMORY = 65536 // 64 MB
export const KDF_PARALLELISM = 4
// 32 random bytes, hex encoded - the length generateKdfSalt() produces and the minimum accepted from the server
export const KDF_SALT_HEX_LENGTH = 64

export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 10000
export const MAX_USERNAME_LENGTH = 500

export const THEME_STORAGE_KEY = 'theme'

export const DEFAULT_CATEGORIES: string[] = ['Personal', 'Work', 'Finance', 'Social', 'Development']
export const ENTRY_COLORS: Array<{ label: string; bg: string }> = [
  { label: 'Red', bg: 'bg-red-600' },
  { label: 'Orange', bg: 'bg-orange-500' },
  { label: 'Yellow', bg: 'bg-amber-400' },
  { label: 'Green', bg: 'bg-emerald-600' },
  { label: 'Blue', bg: 'bg-blue-500' },
  { label: 'Cyan', bg: 'bg-cyan-500' },
  { label: 'Violet', bg: 'bg-violet-500' },
  { label: 'Pink', bg: 'bg-pink-500' },
  { label: 'Slate', bg: 'bg-gray-500' },
  { label: 'Slate Dark', bg: 'bg-gray-700' },
]
export const DEFAULT_COLOR = 'bg-gray-700'

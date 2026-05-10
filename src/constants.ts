export const APP_NAME = 'LibreLock'
export const API_BASE_URL = 'http://localhost:8000/api'

export const DB_NAME = 'librelock'
export const STORE = 'session'
export const KEY_ID = 'master_key'
export const SESSION_FLAG = 'vault_unlocked'

export const KDF_ALGO = 'argon2id'
export const KDF_ITER = 4
export const KDF_MEMORY = 65536 // 64 MB
export const KDF_PARALLELISM = 4

export const MIN_PASSWORD_LENGTH = 12

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
  { label: 'Slate', bg: 'bg-slate-500' },
  { label: 'Slate Dark', bg: 'bg-slate-700' },
]
export const DEFAULT_COLOR = 'bg-slate-800'

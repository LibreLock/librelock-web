// Password strength on one 0-10 scale, estimated two ways.
//
// Both estimators produce *bits of entropy*, and bitsToScore maps bits to the 0-10 integer the
// rest of the app already speaks (WEAK_THRESHOLD, the detail panel bands, the "/10" label).
//
// scoreSync is an upper bound: charset-pool entropy cannot see that "correcthorsebatterystaple"
// is four dictionary words, so it over-rates it. scoreDeep (zxcvbn) is authoritative and corrects
// that, but it pulls a ~450KB dictionary chunk and costs 10-50ms per password, so it is reserved
// for user-initiated surfaces (Security Center, entry detail) and never runs on vault decrypt.

export const WEAK_THRESHOLD = 7 // below "Strong" on the 0-10 strength scale

// Bits required for each score. Index is the score, value is the floor.
const SCORE_BITS = [0, 8, 16, 24, 32, 40, 52, 64, 80, 100, 120]

const POOLS = [
  { re: /[a-z]/, size: 26 },
  { re: /[A-Z]/, size: 26 },
  { re: /[0-9]/, size: 10 },
  { re: /[ -/:-@[-`{-~]/, size: 33 }, // printable ASCII punctuation and space
]
const OTHER_POOL = 40 // anything outside ASCII: accented, CJK, emoji

export function bitsToScore(bits: number): number {
  let score = 0
  for (let i = SCORE_BITS.length - 1; i >= 0; i--) {
    if (bits >= (SCORE_BITS[i] ?? 0)) {
      score = i
      break
    }
  }
  return score
}

function poolSize(password: string): number {
  let pool = 0
  for (const { re, size } of POOLS) {
    if (re.test(password)) pool += size
  }
  if (/[^\x20-\x7e]/.test(password)) pool += OTHER_POOL
  return pool
}

// Characters that add nothing because they continue a run ("aaaa") or an alphabet/keyboard walk
// ("abcd", "1234", "qwerty"). Counted so they contribute a fraction of a character each.
const KEYBOARD_ROWS = ['`1234567890-=', 'qwertyuiop[]\\', "asdfghjkl;'", 'zxcvbnm,./']

function walkDirection(a: string, b: string): boolean {
  const lower = a.toLowerCase()
  const next = b.toLowerCase()
  if (next.charCodeAt(0) - lower.charCodeAt(0) === 1) return true
  if (lower.charCodeAt(0) - next.charCodeAt(0) === 1) return true
  return KEYBOARD_ROWS.some((row) => {
    const i = row.indexOf(lower)
    return i !== -1 && (row[i + 1] === next || row[i - 1] === next)
  })
}

// A character that merely repeats the one before it is nearly free to guess; one that continues
// an alphabet or keyboard walk is cheap but not free
const REPEAT_WEIGHT = 0.1
const WALK_WEIGHT = 0.25

function effectiveLength(password: string): number {
  if (password.length === 0) return 0
  let length = 1
  for (let i = 1; i < password.length; i++) {
    const prev = password[i - 1]!
    const char = password[i]!
    if (char === prev) length += REPEAT_WEIGHT
    else if (walkDirection(prev, char)) length += WALK_WEIGHT
    else length += 1
  }
  return length
}

export function estimateBits(password: string): number {
  const pool = poolSize(password)
  if (pool === 0) return 0
  return effectiveLength(password) * Math.log2(pool)
}

// Instant, dependency-free. Safe to call per keystroke and per entry on vault decrypt.
export function scoreSync(password: string): number {
  return bitsToScore(estimateBits(password))
}

const LOG2_10 = Math.log2(10)

type Zxcvbn = (password: string) => { score: number; guessesLog10: number }

// The dictionaries are loaded once, on first deep score, and shared by every caller
let zxcvbnLoader: Promise<Zxcvbn> | null = null

function loadZxcvbn(): Promise<Zxcvbn> {
  zxcvbnLoader ??= (async () => {
    const [{ ZxcvbnFactory }, common, en] = await Promise.all([
      import('@zxcvbn-ts/core'),
      import('@zxcvbn-ts/language-common'),
      import('@zxcvbn-ts/language-en'),
    ])
    const factory = new ZxcvbnFactory({
      graphs: common.adjacencyGraphs,
      dictionary: { ...common.dictionary, ...en.dictionary },
      translations: en.translations,
    })
    return (password: string) => factory.check(password)
  })()
  return zxcvbnLoader
}

// Keyed by the password itself; it never leaves the client, same as the HIBP breach cache
const deepCache = new Map<string, number>()

// zxcvbn's guess count is only meaningful while it has a pattern to point at. Its bruteforce
// fallback uses a fixed cardinality of 10, so it saturates near 10^20 and would rate a 64-char
// random password the same as a 20-char one. So it is used strictly as a *ceiling*, and only when
// it actually matched something (its own score < 4); above that, pool entropy is the better
// estimate and scoreSync stands.
export function combineScores(sync: number, zScore: number, zGuessesLog10: number): number {
  if (zScore >= 4) return sync
  return Math.min(sync, bitsToScore(zGuessesLog10 * LOG2_10))
}

// Dictionary-aware. Costs a lazy chunk plus ~10-50ms on a cache miss, so keep it off hot paths.
export async function scoreDeep(password: string): Promise<number> {
  if (!password) return 0
  const cached = deepCache.get(password)
  if (cached !== undefined) return cached

  const sync = scoreSync(password)
  let score: number
  try {
    const zxcvbn = await loadZxcvbn()
    const result = zxcvbn(password)
    score = combineScores(sync, result.score, result.guessesLog10)
  } catch {
    score = sync // offline or chunk blocked: the upper bound beats no score at all
  }
  deepCache.set(password, score)
  return score
}

export function strengthLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= WEAK_THRESHOLD) return 'Strong'
  if (score >= 5) return 'Fair'
  return 'Weak'
}

// Excellent and Strong deliberately share the green: the label already separates them, and two
// near-identical greens read as an accident rather than a distinction
export function strengthColor(score: number): string {
  if (score >= WEAK_THRESHOLD) return 'text-emerald-600'
  if (score >= 5) return 'text-amber-600'
  return 'text-red-600'
}

export function strengthDot(score: number): string {
  if (score >= WEAK_THRESHOLD) return 'bg-emerald-500'
  if (score >= 5) return 'bg-amber-500'
  return 'bg-red-500'
}

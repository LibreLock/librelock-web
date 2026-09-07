import { ref, watch } from 'vue'

const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

// Rejection sampling: a plain `random % max` over-represents the first `2^32 % max` values, which
// skews the character distribution and, with it, the strength of what we hand the user. Discard the
// biased tail instead. The server does the same for its codes (crypto/token.go IssueCode)
function randomIndices(count: number, max: number): number[] {
  const limit = Math.floor(0x100000000 / max) * max
  const out: number[] = []
  // Draw a whole batch at a time; rejections are rare, so this is normally a single call
  while (out.length < count) {
    const buf = new Uint32Array(count - out.length)
    crypto.getRandomValues(buf)
    for (const n of buf) {
      if (n < limit) out.push(n % max)
    }
  }
  return out
}

function pick(charset: string): string {
  return charset[randomIndices(1, charset.length)[0]!]!
}

function shuffle(chars: string[]): void {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndices(1, i + 1)[0]!
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
}

export function usePasswordGenerator() {
  const length = ref(20)
  const useUppercase = ref(true)
  const useLowercase = ref(true)
  const useNumbers = ref(true)
  const useSymbols = ref(true)
  const generated = ref('')

  function generate() {
    const sets: string[] = []
    if (useUppercase.value) sets.push(CHARS.uppercase)
    if (useLowercase.value) sets.push(CHARS.lowercase)
    if (useNumbers.value) sets.push(CHARS.numbers)
    if (useSymbols.value) sets.push(CHARS.symbols)
    if (sets.length === 0) {
      generated.value = ''
      return
    }

    const charset = sets.join('')
    // Seed one character from every selected class so the result always matches what the toggles
    // promise. Without this a 20-char password misses a class ~8% of the time, and its score
    // wobbles between runs for no reason the user can see
    const chars = length.value >= sets.length ? sets.map(pick) : []
    while (chars.length < length.value) chars.push(pick(charset))
    shuffle(chars)
    generated.value = chars.join('')
  }

  watch([length, useUppercase, useLowercase, useNumbers, useSymbols], generate)
  generate()

  return { length, useUppercase, useLowercase, useNumbers, useSymbols, generated, generate }
}

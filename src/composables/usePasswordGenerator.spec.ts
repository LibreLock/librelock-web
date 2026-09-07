import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { usePasswordGenerator } from './usePasswordGenerator'

const CLASSES = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  numbers: /[0-9]/,
  symbols: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/,
}

describe('usePasswordGenerator', () => {
  it('defaults to 20 characters with every class enabled', () => {
    const g = usePasswordGenerator()
    expect(g.length.value).toBe(20)
    expect(g.generated.value).toHaveLength(20)
  })

  // The reported bug: with a plain fill, a 20-character password missed a class about 8% of the
  // time ((76/86)^20), so its strength score flickered between runs
  it('always includes every selected class', () => {
    const g = usePasswordGenerator()
    const missing: string[] = []
    for (let i = 0; i < 1000; i++) {
      g.generate()
      for (const [name, re] of Object.entries(CLASSES)) {
        if (!re.test(g.generated.value)) missing.push(`${name} in ${g.generated.value}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('honours a deselected class', async () => {
    const g = usePasswordGenerator()
    g.useSymbols.value = false
    g.useNumbers.value = false
    await nextTick()
    for (let i = 0; i < 200; i++) {
      g.generate()
      expect(g.generated.value).not.toMatch(CLASSES.symbols)
      expect(g.generated.value).not.toMatch(CLASSES.numbers)
      expect(g.generated.value).toMatch(CLASSES.uppercase)
      expect(g.generated.value).toMatch(CLASSES.lowercase)
    }
  })

  it.each([1, 2, 4, 8, 20, 64])('respects length %i', async (n) => {
    const g = usePasswordGenerator()
    g.length.value = n
    await nextTick()
    expect(g.generated.value).toHaveLength(n)
  })

  // The slider allows a length below the number of selected classes; that must still return the
  // requested length rather than truncating or over-filling
  it('returns the requested length when it is shorter than the class count', async () => {
    const g = usePasswordGenerator()
    g.length.value = 2
    await nextTick()
    for (let i = 0; i < 100; i++) {
      g.generate()
      expect(g.generated.value).toHaveLength(2)
    }
  })

  it('returns an empty string when no class is selected', async () => {
    const g = usePasswordGenerator()
    g.useUppercase.value = false
    g.useLowercase.value = false
    g.useNumbers.value = false
    g.useSymbols.value = false
    await nextTick()
    expect(g.generated.value).toBe('')
  })

  it('does not repeat itself', () => {
    const g = usePasswordGenerator()
    const seen = new Set<string>()
    for (let i = 0; i < 500; i++) {
      g.generate()
      seen.add(g.generated.value)
    }
    expect(seen.size).toBe(500)
  })

  // Rejection sampling should leave the charset roughly uniform. With 86 characters over 86k draws
  // the expected count per character is 1000; a modulo bias would skew the low end of the charset
  it('draws characters near-uniformly', async () => {
    const g = usePasswordGenerator()
    g.length.value = 64
    await nextTick()
    const counts = new Map<string, number>()
    for (let i = 0; i < 1500; i++) {
      g.generate()
      for (const c of g.generated.value) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    const values = [...counts.values()]
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    for (const v of values) {
      expect(Math.abs(v - mean) / mean).toBeLessThan(0.25)
    }
  })
})

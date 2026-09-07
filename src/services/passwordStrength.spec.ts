import { describe, it, expect } from 'vitest'
import {
  bitsToScore,
  combineScores,
  estimateBits,
  scoreSync,
  scoreDeep,
  strengthLabel,
  strengthColor,
  strengthDot,
  WEAK_THRESHOLD,
} from './passwordStrength'

// A generated password of the kind PasswordGeneratorCard hands out at its defaults
const GENERATED_20 = 'Xk9#mQ2$vL8@pR4!nT6&'
// The same generator with symbols switched off
const GENERATED_20_ALNUM = 'xkmQvLpRnTwZbCdFgHjK'

describe('bitsToScore', () => {
  it.each([
    [0, 0],
    [7.9, 0],
    [8, 1],
    [39, 4],
    [40, 5],
    [63, 6],
    [64, 7],
    [79, 7],
    [80, 8],
    [100, 9],
    [119, 9],
    [120, 10],
    [400, 10],
  ])('%i bits -> %i', (bits, score) => {
    expect(bitsToScore(bits)).toBe(score)
  })

  it('puts the Strong floor exactly at WEAK_THRESHOLD', () => {
    expect(bitsToScore(64)).toBe(WEAK_THRESHOLD)
    expect(bitsToScore(63.9)).toBeLessThan(WEAK_THRESHOLD)
  })
})

describe('scoreSync', () => {
  it('rates a full-charset generated password top of scale', () => {
    expect(scoreSync(GENERATED_20)).toBe(10)
  })

  // The regression that prompted this: the old scorer awarded +1 per character class, so an
  // otherwise identical generated password scored 9 whenever no digit happened to land
  it('does not penalise a random password for a missing character class', () => {
    const withoutDigits = 'Xk#mQ$vL@pR!nT&wZ%bC'
    expect(scoreSync(withoutDigits)).toBe(10)
    expect(scoreSync(GENERATED_20)).toBe(10)
  })

  // The old scorer capped length credit at 16 characters, so 64 random characters scored 8
  it('keeps crediting length past 16 characters', () => {
    expect(scoreSync(GENERATED_20_ALNUM)).toBe(8)
    expect(scoreSync(GENERATED_20_ALNUM.repeat(3))).toBe(10)
  })

  it.each([
    ['', 0],
    ['a', 0],
    ['1234', 0],
    ['12345678', 1],
    ['qwertyuiop', 1],
    ['aaaaaaaaaaaaaaaaaaaa', 1],
  ])('rates %j as %i', (password, score) => {
    expect(scoreSync(password)).toBe(score)
  })

  it('discounts repeats and keyboard walks against equal-length random text', () => {
    expect(estimateBits('aaaaaaaaaaaa')).toBeLessThan(estimateBits('kzqxmwbvhtsn'))
    expect(estimateBits('qwertyuiop12')).toBeLessThan(estimateBits('kzqxmwbvhtsn'))
  })

  it('never returns a score outside 0-10', () => {
    for (const pw of ['', 'a', GENERATED_20, 'x'.repeat(500), '🔐🗝️🔑']) {
      expect(scoreSync(pw)).toBeGreaterThanOrEqual(0)
      expect(scoreSync(pw)).toBeLessThanOrEqual(10)
    }
  })
})

describe('combineScores', () => {
  // zxcvbn's bruteforce matcher uses a fixed cardinality of 10, so guessesLog10 saturates near 20
  // regardless of real entropy. Treating it as authoritative would demote every strong password
  it('ignores the saturated guess count when zxcvbn found no pattern', () => {
    expect(combineScores(10, 4, 20)).toBe(10)
    expect(combineScores(10, 4, 24.8)).toBe(10)
  })

  it('caps the score when zxcvbn matched something', () => {
    expect(combineScores(6, 1, 4.7)).toBe(1)
    expect(combineScores(5, 2, 8)).toBe(3)
  })

  it('never raises the entropy estimate', () => {
    expect(combineScores(3, 3, 30)).toBe(3)
  })
})

describe('scoreDeep', () => {
  it('keeps a generated password at the top of the scale', async () => {
    await expect(scoreDeep(GENERATED_20)).resolves.toBe(10)
    await expect(scoreDeep(GENERATED_20_ALNUM)).resolves.toBe(8)
  })

  // What scoreSync structurally cannot do: see the dictionary word and the l33t suffix
  it.each([
    ['Password123!', 1],
    ['hunter2', 1],
    ['qwertyuiop', 0],
    ['aaaaaaaaaaaaaaaaaaaa', 0],
    ['', 0],
  ])('rates %j as %i', async (password, score) => {
    await expect(scoreDeep(password)).resolves.toBe(score)
  })

  it('flags as weak what scoreSync called strong', async () => {
    expect(scoreSync('Password123!')).toBeGreaterThan(await scoreDeep('Password123!'))
    await expect(scoreDeep('Password123!')).resolves.toBeLessThan(WEAK_THRESHOLD)
  })
})

describe('presentation helpers', () => {
  it.each([
    [10, 'Excellent'],
    [9, 'Excellent'],
    [8, 'Strong'],
    [7, 'Strong'],
    [6, 'Fair'],
    [5, 'Fair'],
    [4, 'Weak'],
    [0, 'Weak'],
  ])('labels %i as %s', (score, label) => {
    expect(strengthLabel(score)).toBe(label)
  })

  // Excellent and Strong share the green on purpose; Fair and Weak must stay distinct from it
  it('uses one green for Excellent and Strong, and separate colours below', () => {
    expect(strengthColor(10)).toBe(strengthColor(8))
    expect(strengthDot(10)).toBe(strengthDot(8))
    expect(new Set([10, 6, 0].map(strengthColor)).size).toBe(3)
    expect(new Set([10, 6, 0].map(strengthDot)).size).toBe(3)
  })

  it('turns Weak exactly below WEAK_THRESHOLD', () => {
    expect(strengthLabel(WEAK_THRESHOLD)).toBe('Strong')
    expect(strengthLabel(WEAK_THRESHOLD - 1)).not.toBe('Strong')
  })
})

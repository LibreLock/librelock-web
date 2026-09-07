import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PasswordStrengthMeter from './PasswordStrengthMeter.vue'
import PasswordGeneratorCard from './PasswordGeneratorCard.vue'

describe('PasswordStrengthMeter', () => {
  // It first shipped with an optional `show` boolean guarding the root v-if. Vue casts an absent
  // Boolean prop to false rather than undefined, so the meter rendered as an empty comment node
  it('renders without any optional prop', () => {
    const w = mount(PasswordStrengthMeter, { props: { score: 8 } })
    expect(w.html()).not.toContain('<!--v-if-->')
    expect(w.text()).toContain('Strong')
  })

  it.each([
    [10, 'Excellent · 10/10'],
    [8, 'Strong · 8/10'],
    [5, 'Fair · 5/10'],
    [0, 'Weak · 0/10'],
  ])('renders score %i as %s', (score, text) => {
    expect(
      mount(PasswordStrengthMeter, { props: { score } }).text().replace(/\s+/g, ' '),
    ).toContain(text)
  })

  it('sizes the bar to the score', () => {
    const bar = (score: number) =>
      mount(PasswordStrengthMeter, { props: { score } }).findAll('div').at(-1)!.attributes('style')
    expect(bar(10)).toContain('width: 100%')
    expect(bar(5)).toContain('width: 50%')
    expect(bar(0)).toContain('width: 0%')
  })

  it('clamps a score outside 0-10', () => {
    expect(mount(PasswordStrengthMeter, { props: { score: 99 } }).html()).toContain('width: 100%')
    expect(mount(PasswordStrengthMeter, { props: { score: -5 } }).html()).toContain('width: 0%')
  })
})

describe('PasswordGeneratorCard', () => {
  it('shows the meter for the generated password', () => {
    const w = mount(PasswordGeneratorCard)
    expect(w.findComponent(PasswordStrengthMeter).exists()).toBe(true)
    expect(w.text()).toMatch(/Excellent|Strong|Fair|Weak/)
  })

  it('replaces the meter with the empty-charset warning', async () => {
    const w = mount(PasswordGeneratorCard)
    for (const box of w.findAll('input[type="checkbox"]')) await box.setValue(false)
    expect(w.findComponent(PasswordStrengthMeter).exists()).toBe(false)
    expect(w.text()).toContain('Select at least one character type.')
  })
})

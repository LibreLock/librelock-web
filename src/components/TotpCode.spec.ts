import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setShowNextCode } from '@/composables/useTotpPrefs'
import { formatCode, generateTotp, parseOtpInput } from '@/services/totp'
import TotpCode from './TotpCode.vue'

const KEY = 'JBSWY3DPEHPK3PXP'
// 10s into a 30s window: current code for window N, next code for window N+1
const NOW = 1_700_000_010_000

function params() {
  const parsed = parseOtpInput(KEY)
  if (!parsed.ok) throw new Error('parse failed')
  return parsed.params
}

describe('TotpCode next code', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    localStorage.clear()
  })
  afterEach(() => {
    setShowNextCode(false)
    vi.useRealTimers()
  })

  it('shows only the current code while the setting is off', async () => {
    setShowNextCode(false)
    const wrapper = mount(TotpCode, { props: { uri: KEY } })
    const current = formatCode(await generateTotp(params(), NOW))
    await vi.waitFor(() => expect(wrapper.text()).toContain(current))
    expect(wrapper.find('[title="Next code"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('also shows the code of the following window when the setting is on', async () => {
    setShowNextCode(true)
    const wrapper = mount(TotpCode, { props: { uri: KEY } })
    const current = formatCode(await generateTotp(params(), NOW))
    const next = formatCode(await generateTotp(params(), NOW + 30_000))
    expect(next).not.toBe(current)

    await vi.waitFor(() => expect(wrapper.text()).toContain(next))
    expect(wrapper.text()).toContain(current)
    wrapper.unmount()
  })

  it('appears and disappears as the setting is flipped', async () => {
    setShowNextCode(false)
    const wrapper = mount(TotpCode, { props: { uri: KEY } })
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('---'))

    setShowNextCode(true)
    await vi.waitFor(() => expect(wrapper.find('[title="Next code"]').exists()).toBe(true))

    setShowNextCode(false)
    await vi.waitFor(() => expect(wrapper.find('[title="Next code"]').exists()).toBe(false))
    wrapper.unmount()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import type { VaultPassword } from '@/api/vault'

const store = vi.hoisted(() => ({
  passwords: [] as unknown[],
  addEntry: vi.fn<(payload: unknown, shared: boolean) => Promise<unknown>>(
    async (payload) => payload,
  ),
  editEntry: vi.fn<(entry: unknown, payload: unknown) => Promise<unknown>>(
    async (_entry, payload) => payload,
  ),
}))

vi.mock('@/composables/useEntries', async () => {
  const { reactive } = await import('vue')
  const state = reactive(store)
  return { useEntries: () => state }
})

import TotpImportModal from './TotpImportModal.vue'

const GITHUB = 'otpauth://totp/GitHub:octo@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'
const BANK = 'otpauth://totp/Bank:me?secret=GEZDGNBVGY3TQOJQ&issuer=Bank&digits=8'

function existing(over: Partial<VaultPassword>): VaultPassword {
  return {
    id: 'e1',
    type: 'password',
    name: 'GitHub',
    username: '',
    email: '',
    password: 'pw',
    url: '',
    notes: '',
    ssoProvider: null,
    ssoLabel: '',
    ssoEntryId: null,
    excludeFromAnalytics: false,
    totp: null,
    color: 'bg-gray-700',
    icon: null,
    categoryId: null,
    shared: false,
    passwordStrength: 5,
    reused: false,
    breached: false,
    createdAt: '',
    updatedAt: '',
    ...over,
  }
}

async function open(text: string) {
  const wrapper = mount(TotpImportModal)
  await wrapper.get('textarea').setValue(text)
  return wrapper
}

describe('TotpImportModal', () => {
  beforeEach(() => {
    store.passwords = reactive([])
    store.addEntry.mockClear()
    store.editEntry.mockClear()
  })

  it('previews pasted links and creates one entry per account', async () => {
    const wrapper = await open(`${GITHUB}\n${BANK}`)

    expect(wrapper.text()).toContain('2 accounts found')
    expect(wrapper.text()).toContain('GitHub')
    expect(wrapper.text()).toContain('octo@example.com')
    expect(wrapper.text()).toContain('Import 2 codes')

    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Import 2'))
      ?.trigger('click')
    await flushPromises()

    expect(store.addEntry).toHaveBeenCalledTimes(2)
    const [payload, shared] = store.addEntry.mock.calls[0] as [Record<string, unknown>, boolean]
    expect(shared).toBe(false)
    expect(payload).toMatchObject({
      type: 'password',
      name: 'GitHub',
      email: 'octo@example.com',
      username: '',
      password: '',
    })
    expect(String(payload.totp)).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(wrapper.emitted('imported')?.[0]).toEqual([2])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('leaves out an account the user unticks', async () => {
    const wrapper = await open(`${GITHUB}\n${BANK}`)
    await wrapper.findAll('input[type="checkbox"]')[0]?.setValue(false)

    expect(wrapper.text()).toContain('Import 1 code')
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Import 1'))
      ?.trigger('click')
    await flushPromises()

    expect(store.addEntry).toHaveBeenCalledTimes(1)
    expect(store.addEntry.mock.calls[0]?.[0]).toMatchObject({ name: 'Bank' })
  })

  it('adds the code to a matching entry instead of creating a second one', async () => {
    const github = existing({ id: 'g' })
    store.passwords = reactive([github])
    const wrapper = await open(GITHUB)

    expect(wrapper.text()).toContain('Adds to "GitHub"')
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Import 1'))
      ?.trigger('click')
    await flushPromises()

    expect(store.addEntry).not.toHaveBeenCalled()
    expect(store.editEntry).toHaveBeenCalledTimes(1)
    const [entry, payload] = store.editEntry.mock.calls[0] as [
      VaultPassword,
      Record<string, unknown>,
    ]
    expect(entry.id).toBe('g')
    expect(String(payload.totp)).toContain('secret=JBSWY3DPEHPK3PXP')
    // The rest of the entry is written back untouched
    expect(payload).toMatchObject({ name: 'GitHub', password: 'pw' })
  })

  it('shows an already-imported code as taken and cannot import it', async () => {
    store.passwords = reactive([existing({ id: 'x', name: 'Other', totp: GITHUB })])
    const wrapper = await open(GITHUB)

    expect(wrapper.text()).toContain('Already in your vault')
    const button = wrapper.findAll('button').find((b) => b.text() === 'Import')
    expect(button?.attributes('disabled')).toBeDefined()
  })

  it('says what it skipped', async () => {
    const wrapper = await open(
      `${GITHUB}\notpauth://hotp/x?secret=JBSWY3DPEHPK3PXP&counter=1\notpauth://totp/bad?secret=!!`,
    )
    expect(wrapper.text()).toContain('1 counter-based (HOTP) account was skipped')
    expect(wrapper.text()).toContain('1 item could not be read')
  })

  it('keeps the dialog open and reports a failure when a save fails', async () => {
    store.addEntry.mockRejectedValueOnce(new Error('nope'))
    const wrapper = await open(GITHUB)
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Import 1'))
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeFalsy()
  })
})

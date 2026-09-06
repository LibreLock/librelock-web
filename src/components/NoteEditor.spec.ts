import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NoteEditor from './NoteEditor.vue'

async function mountEditor(modelValue = '') {
  const wrapper = mount(NoteEditor, { props: { modelValue }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

type EditorHandle = {
  view: {
    someProp: (
      name: string,
      f: (handler: (view: unknown, from: number, to: number, text: string) => boolean) => boolean,
    ) => boolean
    state: { selection: { from: number } }
  }
  commands: Record<string, (() => void) | undefined> & {
    insertContent?: (value: string) => void
  }
  isEditable: boolean
  storage: { markdown: { getMarkdown: () => string } }
}

function editorOf(wrapper: unknown) {
  const state = (wrapper as { vm: { $: { setupState: Record<string, unknown> } } }).vm.$.setupState
  const candidate = state.editor as { value?: unknown } | undefined
  return (candidate && 'value' in candidate ? candidate.value : candidate) as EditorHandle
}

function lastEmit(wrapper: { emitted: (name: string) => unknown[][] | undefined }) {
  const events = wrapper.emitted('update:modelValue') as unknown[][] | undefined
  return (events?.at(-1)?.[0] ?? '') as string
}

describe('NoteEditor', () => {
  it('renders existing markdown as formatted content', async () => {
    const wrapper = await mountEditor('# Title\n\n- one\n- two\n\n**bold** and `code`')
    const html = wrapper.html()

    expect(html).toContain('<h1')
    expect(html).toContain('<ul')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code')
    // The document is styled with the same classes the read-only view uses
    expect(html).toContain('list-disc')
    wrapper.unmount()
  })

  it('emits markdown, not HTML, when the content changes', async () => {
    const wrapper = await mountEditor('plain line')
    const editor = editorOf(wrapper)

    editor.commands.selectAll?.()
    editor.commands.toggleBold?.()
    await flushPromises()

    expect(lastEmit(wrapper)).toBe('**plain line**')
    wrapper.unmount()
  })

  it('round-trips headings, task lists and links through markdown', async () => {
    const source =
      '## Recovery\n\n- [ ] rotate key\n- [x] archived\n\n[docs](https://example.com/x)'
    const wrapper = await mountEditor(source)
    const editor = editorOf(wrapper)

    expect(wrapper.html()).toContain('<h2')
    expect(wrapper.html()).toContain('data-type="taskList"')
    expect(wrapper.html()).toContain('href="https://example.com/x"')

    const markdown = editor.storage.markdown.getMarkdown()
    expect(markdown).toContain('## Recovery')
    expect(markdown).toContain('[ ] rotate key')
    expect(markdown).toContain('[x] archived')
    expect(markdown).toContain('[docs](https://example.com/x)')
    wrapper.unmount()
  })

  it('turns a fenced block into a real code block and back into a fence', async () => {
    const wrapper = await mountEditor('```\nnpm run dev\n```')
    const editor = editorOf(wrapper)

    expect(wrapper.html()).toContain('<pre')
    expect(wrapper.html()).toContain('npm run dev')
    expect(editor.storage.markdown.getMarkdown()).toBe('```\nnpm run dev\n```')
    wrapper.unmount()
  })

  it('opens a code block when the author types a fence', async () => {
    const wrapper = await mountEditor('')
    const editor = editorOf(wrapper)

    editor.commands.insertContent?.('```')
    const pos = editor.view.state.selection.from
    // Input rules fire on typed text, which insertContent does not simulate on its own
    editor.view.someProp('handleTextInput', (handler) => handler(editor.view, pos, pos, ' '))
    await flushPromises()

    expect(wrapper.html()).toContain('<pre')
    wrapper.unmount()
  })

  it('turns typed markdown link syntax into a link', async () => {
    const wrapper = await mountEditor('')
    const editor = editorOf(wrapper)

    editor.commands.insertContent?.('Visit [nvm](https://example.com/x')
    const pos = editor.view.state.selection.from
    editor.view.someProp('handleTextInput', (handler) => handler(editor.view, pos, pos, ')'))
    await flushPromises()

    expect(wrapper.html()).toContain('href="https://example.com/x"')
    expect(wrapper.html()).toContain('>nvm</a>')
    expect(editor.storage.markdown.getMarkdown()).toBe('Visit [nvm](https://example.com/x)')
    wrapper.unmount()
  })

  it('hides the toolbar and stops editing when disabled', async () => {
    const wrapper = mount(NoteEditor, { props: { modelValue: 'text', disabled: true } })
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(false)
    expect(editorOf(wrapper).isEditable).toBe(false)
    wrapper.unmount()
  })

  it('takes external content changes without echoing them back', async () => {
    const wrapper = await mountEditor('first')
    await wrapper.setProps({ modelValue: '# second' })
    await flushPromises()

    expect(wrapper.html()).toContain('<h1')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
})

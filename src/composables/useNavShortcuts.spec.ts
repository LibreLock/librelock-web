import { describe, expect, it } from 'vitest'

import { isTyping } from './useNavShortcuts'

describe('isTyping', () => {
  it('is true for form fields', () => {
    for (const tag of ['input', 'textarea', 'select']) {
      expect(isTyping(document.createElement(tag))).toBe(true)
    }
  })

  it('is true inside a rich text editor surface', () => {
    const editor = document.createElement('div')
    editor.contentEditable = 'true'
    // jsdom does not derive isContentEditable from the attribute
    Object.defineProperty(editor, 'isContentEditable', { value: true })
    expect(isTyping(editor)).toBe(true)
  })

  it('is false for the page at large', () => {
    expect(isTyping(document.createElement('div'))).toBe(false)
    expect(isTyping(document.createElement('button'))).toBe(false)
    expect(isTyping(null)).toBe(false)
  })
})

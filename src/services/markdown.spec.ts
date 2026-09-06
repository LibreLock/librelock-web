import { describe, expect, it } from 'vitest'

import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders plain text as a paragraph', () => {
    expect(renderMarkdown('hello world')).toBe(
      '<p class="my-2 first:mt-0 last:mb-0">hello world</p>',
    )
  })

  it('keeps single newlines as line breaks and blank lines as new paragraphs', () => {
    expect(renderMarkdown('one\ntwo')).toContain('one<br />two')
    const two = renderMarkdown('one\n\ntwo')
    expect(two).toContain('>one</p>')
    expect(two).toContain('>two</p>')
  })

  it('escapes HTML in the source', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"> & <b>bold</b>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;img')
    expect(html).toContain('&amp;')
  })

  it('renders emphasis, strikethrough and inline code', () => {
    expect(renderMarkdown('**b** and *i* and _i_ and __b__ and ~~s~~')).toContain(
      '<strong>b</strong>',
    )
    expect(renderMarkdown('*i*')).toContain('<em>i</em>')
    expect(renderMarkdown('~~s~~')).toContain('<del>s</del>')
    expect(renderMarkdown('use `npm run dev`')).toContain('<code class="')
  })

  it('nests emphasis inside strong', () => {
    expect(renderMarkdown('**bold _and italic_**')).toContain(
      '<strong>bold <em>and italic</em></strong>',
    )
    expect(renderMarkdown('(_hi_)')).toContain('(<em>hi</em>)')
  })

  it('keeps a numbered list on its own starting number', () => {
    expect(renderMarkdown('3. three\n4. four')).toContain('start="3"')
    expect(renderMarkdown('1. one')).not.toContain('start=')
  })

  it('does not apply emphasis inside inline code', () => {
    const html = renderMarkdown('`a *b* c`')
    expect(html).not.toContain('<em>')
    expect(html).toContain('a *b* c')
  })

  it('treats snake_case words as plain text', () => {
    expect(renderMarkdown('some_var_name here')).toContain('some_var_name')
  })

  it('renders headings at every level', () => {
    expect(renderMarkdown('# Title')).toContain('<h1 class="')
    expect(renderMarkdown('###### Small')).toContain('<h6 class="')
    expect(renderMarkdown('#NotAHeading')).toContain('<p class="')
  })

  it('renders bullet, numbered and task lists', () => {
    const bullets = renderMarkdown('- one\n- two')
    expect(bullets).toContain('<ul class="')
    expect(bullets).toContain('<li>one</li>')

    expect(renderMarkdown('1. one\n2. two')).toContain('<ol class="')

    const tasks = renderMarkdown('- [ ] todo\n- [x] done')
    // Checkboxes are drawn, not typed: a bordered box, and a tick inside the done one
    expect(tasks).toContain('rounded-sm border')
    expect(tasks).toContain('<svg')
    expect(tasks).toContain('line-through')
    // An all-task list drops the bullet markers
    expect(tasks).not.toContain('list-disc')
  })

  it('folds an indented continuation line into the item above it', () => {
    const html = renderMarkdown('- one\n  still one\n- two')
    expect(html).toContain('one<br />still one</li>')
  })

  it('renders fenced code blocks verbatim', () => {
    const html = renderMarkdown('```\nif (a < b) {\n  go()\n}\n```')
    expect(html).toContain('<pre class="')
    expect(html).toContain('if (a &lt; b) {')
    expect(html).not.toContain('<em>')
  })

  it('renders blockquotes and horizontal rules', () => {
    expect(renderMarkdown('> quoted')).toContain('<blockquote class="')
    expect(renderMarkdown('---')).toContain('<hr class="')
    expect(renderMarkdown('***')).toContain('<hr class="')
  })

  it('renders safe links and leaves unsafe ones as text', () => {
    const link = renderMarkdown('[docs](https://example.com/x)')
    expect(link).toContain('href="https://example.com/x"')
    expect(link).toContain('rel="noopener noreferrer"')
    expect(link).toContain('>docs</a>')

    const bad = renderMarkdown('[click](javascript:alert(1))')
    expect(bad).not.toContain('<a ')
    expect(bad).toContain('[click]')
  })

  it('drops the trailing backslash the editor writes for a Shift+Enter break', () => {
    const html = renderMarkdown('test\\\ntest\\\ntest')
    expect(html).toContain('test<br />test<br />test')
    expect(html).not.toContain('\\')

    // An escaped backslash is still a backslash
    expect(renderMarkdown('back\\\\slash')).toContain('back\\slash')
  })

  it('treats backslash-escaped punctuation as literal text', () => {
    // What an editor writes when the author typed the brackets rather than a link
    const html = renderMarkdown('Visit \\[nvm\\](https://example.com) later')
    expect(html).not.toContain('<a ')
    expect(html).toContain('[nvm](https://example.com)')
    expect(html).not.toContain('\\')

    expect(renderMarkdown('2 \\* 3 \\* 4')).toContain('2 * 3 * 4')
    expect(renderMarkdown('\\*not italic\\*')).toContain('*not italic*')
  })

  it('links an autolink written in angle brackets', () => {
    const html = renderMarkdown('Visit <https://www.example.com/docs> today')
    expect(html).toContain('href="https://www.example.com/docs"')
    // The scheme and www are noise in the label, the same way entry URLs are shown
    expect(html).toContain('>example.com/docs</a>')
    expect(html).not.toContain('&lt;https')

    expect(renderMarkdown('<mailto:help@example.com>')).toContain('href="mailto:help@example.com"')
    // A query string is part of the URL, not the end of it
    expect(renderMarkdown('<https://example.com/a?b=1&c=2>')).toContain(
      'href="https://example.com/a?b=1&amp;c=2"',
    )
    // Not every angle bracket is a link
    expect(renderMarkdown('a < b and c > d')).not.toContain('<a ')
  })

  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
  })
})

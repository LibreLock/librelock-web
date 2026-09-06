/**
 * A small, self-contained Markdown renderer for note bodies.
 *
 * Notes are decrypted user content, so the renderer never lets raw HTML through: every
 * character is escaped first and the output is built only from tags this file writes.
 * That keeps it dependency-free and safe by construction - there is no sanitizer to keep
 * in step, because nothing unescaped ever reaches the output.
 *
 * Supported: headings, bold/italic/strikethrough, inline code, fenced code blocks,
 * links (http/https/mailto only), bullet/numbered/task lists, blockquotes and
 * horizontal rules.
 */
import { NOTE_CLASS, NOTE_HEADING_CLASS } from './noteStyles'
import { displayUrl, externalHref } from './url'

const CODE_TOKEN = '\u0000'
const ESCAPE_TOKEN = '\u0001'

function escapeHtml(value: string): string {
  return (
    value
      .split(CODE_TOKEN)
      .join('')
      .split(ESCAPE_TOKEN)
      .join('')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  )
}

function unescapeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

const LINK_CLASS = NOTE_CLASS.link
const CODE_CLASS = NOTE_CLASS.code
const PRE_CLASS = NOTE_CLASS.codeBlock
const HEADING_CLASS = NOTE_HEADING_CLASS
const CHECK_BOX = 'mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-gray-400 dark:border-gray-500'
const CHECK_BOX_DONE = 'mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-gray-500 bg-gray-500'
const CHECK_MARK = '<svg viewBox="0 0 24 24" class="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L19 7" /></svg>'
const CHECKED = `<span aria-hidden="true" class="${CHECK_BOX_DONE}">${CHECK_MARK}</span>`
const UNCHECKED = `<span aria-hidden="true" class="${CHECK_BOX}"></span>`

function renderInline(escaped: string): string {
  const codes: string[] = []
  let text = escaped.replace(/`([^`]+)`/g, (_match, code: string) => {
    codes.push(`<code class="${CODE_CLASS}">${code}</code>`)
    return `${CODE_TOKEN}${codes.length - 1}${CODE_TOKEN}`
  })

  const escapes: string[] = []
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, (_match, char: string) => {
    escapes.push(char)
    return `${ESCAPE_TOKEN}${escapes.length - 1}${ESCAPE_TOKEN}`
  })

  text = text.replace(
    /&lt;((?:https?:\/\/|mailto:)(?:(?!&gt;)\S)+)&gt;/g,
    (match, target: string) => {
      const raw = unescapeEntities(target)
      const href = externalHref(raw)
      if (!href) return match
      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="${LINK_CLASS}">${escapeHtml(displayUrl(raw))}</a>`
    },
  )

  text = text.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (match, label: string, target: string) => {
    // The target was escaped along with the rest of the line; undo that before parsing it.
    const href = externalHref(unescapeEntities(target))
    if (!href) return match
    const escapedHref = escapeHtml(href)
    return `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" class="${LINK_CLASS}">${label || escapedHref}</a>`
  })

  text = text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__([^_]+)__(?=[^\w]|$)/g, '$1<strong>$2</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')

  text = text.replace(
    new RegExp(`${ESCAPE_TOKEN}(\\d+)${ESCAPE_TOKEN}`, 'g'),
    (match, index: string) => escapes[Number(index)] ?? match,
  )

  return text.replace(
    new RegExp(`${CODE_TOKEN}(\\d+)${CODE_TOKEN}`, 'g'),
    (match, index: string) => codes[Number(index)] ?? match,
  )
}

function renderListItem(body: string): { html: string; task: boolean } {
  const task = /^\[([ xX])\]\s+(.*)$/.exec(body)
  if (!task) return { html: `<li>${renderInline(escapeHtml(body))}</li>`, task: false }

  const checked = task[1] !== ' '
  const label = renderInline(escapeHtml(task[2] ?? ''))
  const labelClass = checked ? ' class="text-gray-400 dark:text-gray-500 line-through"' : ''
  return {
    html: `<li class="${NOTE_CLASS.taskItem}">${checked ? CHECKED : UNCHECKED}<span${labelClass}>${label}</span></li>`,
    task: true,
  }
}

export function renderMarkdown(source: string | null | undefined): string {
  const lines = (source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []

  let paragraph: string[] = []
  let quote: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    const body = paragraph.map((line) => renderInline(escapeHtml(line))).join('<br />')
    out.push(`<p class="${NOTE_CLASS.paragraph}">${body}</p>`)
    paragraph = []
  }
  const flushQuote = () => {
    if (!quote.length) return
    out.push(
      `<blockquote class="${NOTE_CLASS.blockquote}">${renderMarkdown(quote.join('\n'))}</blockquote>`,
    )
    quote = []
  }
  const flush = () => {
    flushParagraph()
    flushQuote()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    const fence = /^ {0,3}(```|~~~)/.exec(line)
    if (fence) {
      flush()
      const marker = fence[1]
      const closing = new RegExp(`^ {0,3}${marker}\\s*$`)
      const code: string[] = []
      i++
      while (i < lines.length && !closing.test(lines[i] ?? '')) {
        code.push(lines[i] ?? '')
        i++
      }
      out.push(`<pre class="${PRE_CLASS}"><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    if (line.trim() === '') {
      flush()
      continue
    }

    const quoted = /^ {0,3}>\s?(.*)$/.exec(line)
    if (quoted) {
      flushParagraph()
      quote.push(quoted[1] ?? '')
      continue
    }
    flushQuote()

    if (/^ {0,3}([-*_])\s*(\1\s*){2,}$/.test(line)) {
      flush()
      out.push(`<hr class="${NOTE_CLASS.horizontalRule}" />`)
      continue
    }

    const heading = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      flush()
      const level = heading[1]?.length ?? 1
      out.push(
        `<h${level} class="${HEADING_CLASS[level] ?? ''}">${renderInline(escapeHtml(heading[2] ?? ''))}</h${level}>`,
      )
      continue
    }

    const bullet = /^ {0,3}[-*+]\s+(.*)$/.exec(line)
    const numbered = /^ {0,3}\d{1,9}[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      flush()
      const ordered = !bullet
      const itemOf = (candidate: string) =>
        ordered
          ? /^ {0,3}\d{1,9}[.)]\s+(.*)$/.exec(candidate)
          : /^ {0,3}[-*+]\s+(.*)$/.exec(candidate)

      const items: string[] = []
      const firstNumber = Number(/^ {0,3}(\d{1,9})[.)]/.exec(line)?.[1] ?? '1')
      let allTasks = true
      while (i < lines.length) {
        const item = itemOf(lines[i] ?? '')
        if (item) {
          const rendered = renderListItem(item[1] ?? '')
          allTasks = allTasks && rendered.task
          items.push(rendered.html)
          i++
          continue
        }
        // An indented line with no marker of its own continues the item above it.
        const previous = items[items.length - 1]
        if (previous && /^\s{2,}\S/.test(lines[i] ?? '')) {
          items[items.length - 1] = previous.replace(
            /<\/li>$/,
            `<br />${renderInline(escapeHtml((lines[i] ?? '').trim()))}</li>`,
          )
          i++
          continue
        }
        break
      }
      i--

      // A list whose every item is a checkbox drops its markers, the way the editor draws it
      const tasks = allTasks && !ordered && items.length > 0
      const tag = ordered ? 'ol' : 'ul'
      const listClass = tasks
        ? NOTE_CLASS.taskList
        : ordered
          ? NOTE_CLASS.orderedList
          : NOTE_CLASS.bulletList
      // "3." should still read as 3 rather than restarting the count
      const start = ordered && firstNumber !== 1 ? ` start="${firstNumber}"` : ''
      out.push(`<${tag} class="${listClass}"${start}>${items.join('')}</${tag}>`)
      continue
    }

    paragraph.push(line.replace(/\s+$/, ''))
  }

  flush()
  return out.join('')
}

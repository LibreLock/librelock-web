/**
 * The look of a rendered note, in one place.
 *
 * Two things draw notes: the read-only renderer in `markdown.ts` and the Tiptap editor in
 * `NoteEditor.vue`. Sharing these class strings is what makes the editor a real WYSIWYG -
 * what you type is styled exactly the way the saved note will be.
 */
export const NOTE_CLASS = {
  paragraph: 'my-2 first:mt-0 last:mb-0',
  link: 'text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300',
  code: 'rounded border border-gray-300 dark:border-gray-600 bg-gray-200/70 dark:bg-gray-900 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-900 dark:text-gray-100',
  codeBlock:
    'my-2 overflow-x-auto rounded-lg border border-gray-800 dark:border-gray-700 bg-gray-900 dark:bg-gray-950 p-3 font-mono text-[0.8125rem] leading-relaxed text-gray-100 dark:text-gray-200',
  bulletList: 'my-2 ml-5 list-disc space-y-0.5 marker:text-gray-400',
  orderedList: 'my-2 ml-5 list-decimal space-y-0.5 marker:text-gray-400',
  taskList: 'my-2 space-y-0.5',
  taskItem: 'flex items-start gap-2',
  blockquote:
    'my-2 border-l-2 border-gray-300 dark:border-gray-600 pl-3 text-gray-600 dark:text-gray-400',
  horizontalRule: 'my-3 border-gray-200 dark:border-gray-700',
  body: 'wrap-break-word text-sm text-gray-700 dark:text-gray-300',
} as const

export const NOTE_HEADING_CLASS: Record<number, string> = {
  1: 'mt-3 mb-1.5 text-base font-semibold text-gray-900 dark:text-gray-100 first:mt-0',
  2: 'mt-3 mb-1.5 text-[0.95rem] font-semibold text-gray-900 dark:text-gray-100 first:mt-0',
  3: 'mt-3 mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100 first:mt-0',
  4: 'mt-2 mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200 first:mt-0',
  5: 'mt-2 mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200 first:mt-0',
  6: 'mt-2 mb-1 text-sm font-semibold text-gray-600 dark:text-gray-400 first:mt-0',
}

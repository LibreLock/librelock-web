<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Heading, { type Level } from '@tiptap/extension-heading'
import Link from '@tiptap/extension-link'
import { InputRule } from '@tiptap/core'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Markdown } from 'tiptap-markdown'

import EditorIcon, { type EditorIconName } from '@/components/icons/EditorIcon.vue'
import { NOTE_CLASS, NOTE_HEADING_CLASS } from '@/services/noteStyles'
import { externalHref } from '@/services/url'

const HEADING_LEVELS: Level[] = [1, 2, 3]

type MarkdownStorage = { markdown: { getMarkdown: () => string } }
const markdownOf = (instance: Editor) =>
  (instance.storage as unknown as MarkdownStorage).markdown.getMarkdown()

const props = withDefaults(
  defineProps<{
    modelValue: string
    disabled?: boolean
    minHeightClass?: string
    ariaLabel?: string
  }>(),
  { disabled: false, minHeightClass: 'min-h-20', ariaLabel: 'Note' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const StyledHeading = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const levels = this.options.levels as Level[]
    const level: Level = levels.includes(node.attrs.level) ? node.attrs.level : (levels[0] ?? 1)
    return [`h${level}`, { ...HTMLAttributes, class: NOTE_HEADING_CLASS[level] ?? '' }, 0]
  },
})

const MARKDOWN_LINK = /\[([^\]]+)\]\((\S+)\)$/
const MarkdownLink = Link.extend({
  addInputRules() {
    return [
      new InputRule({
        find: MARKDOWN_LINK,
        handler: ({ range, match, chain }) => {
          const href = externalHref(match[2] ?? '')
          const text = match[1] ?? ''
          if (!href || !text) return null
          chain()
            .deleteRange(range)
            .insertContent([{ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }])
            .unsetMark('link')
            .run()
          return undefined
        },
      }),
    ]
  },
})

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: false,
      paragraph: { HTMLAttributes: { class: NOTE_CLASS.paragraph } },
      bulletList: { HTMLAttributes: { class: NOTE_CLASS.bulletList } },
      orderedList: { HTMLAttributes: { class: NOTE_CLASS.orderedList } },
      blockquote: { HTMLAttributes: { class: NOTE_CLASS.blockquote } },
      codeBlock: { HTMLAttributes: { class: NOTE_CLASS.codeBlock } },
      code: { HTMLAttributes: { class: NOTE_CLASS.code } },
      horizontalRule: { HTMLAttributes: { class: NOTE_CLASS.horizontalRule } },
      link: false,
    }),
    MarkdownLink.configure({
      openOnClick: false,
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { class: NOTE_CLASS.link, rel: 'noopener noreferrer', target: '_blank' },
    }),
    StyledHeading.configure({ levels: HEADING_LEVELS }),
    TaskList.configure({ HTMLAttributes: { class: NOTE_CLASS.taskList } }),
    TaskItem.configure({ nested: true, HTMLAttributes: { class: NOTE_CLASS.taskItem } }),
    Markdown.configure({
      html: false,
      breaks: true,
      linkify: false,
      bulletListMarker: '-',
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ],
  editorProps: {
    attributes: {
      class: `${NOTE_CLASS.body} ${props.minHeightClass} focus:outline-none`,
      'aria-label': props.ariaLabel,
    },
  },
  onUpdate: ({ editor: instance }) => {
    emit('update:modelValue', markdownOf(instance))
  },
})

watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value
    if (!instance || value === markdownOf(instance)) return
    instance.commands.setContent(value, { emitUpdate: false })
  },
)

watch(
  () => props.disabled,
  (disabled) => editor.value?.setEditable(!disabled),
)

const linkOpen = ref(false)
const linkDraft = ref('')
const linkInput = ref<HTMLInputElement | null>(null)

async function openLink() {
  const instance = editor.value
  if (!instance) return
  linkDraft.value = instance.getAttributes('link').href ?? ''
  linkOpen.value = true
  await nextTick()
  linkInput.value?.focus()
}

function applyLink() {
  const instance = editor.value
  if (!instance) return
  const href = externalHref(linkDraft.value)
  const chain = instance.chain().focus().extendMarkRange('link')
  if (href) chain.setLink({ href }).run()
  else chain.unsetLink().run()
  linkOpen.value = false
  linkDraft.value = ''
}

function clearLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  linkOpen.value = false
}

onBeforeUnmount(() => editor.value?.destroy())

type ToolbarItem = {
  id: string
  icon: EditorIconName
  label: string
  active?: { name: string; attrs?: Record<string, unknown> }
  run: (instance: Editor) => void
}

const TOOL_GROUPS: ToolbarItem[][] = [
  [
    {
      id: 'bold',
      icon: 'bold',
      label: 'Bold',
      active: { name: 'bold' },
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      icon: 'italic',
      label: 'Italic',
      active: { name: 'italic' },
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      id: 'strike',
      icon: 'strike',
      label: 'Strikethrough',
      active: { name: 'strike' },
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      id: 'code',
      icon: 'code',
      label: 'Inline code',
      active: { name: 'code' },
      run: (e) => e.chain().focus().toggleCode().run(),
    },
  ],
  HEADING_LEVELS.map((level) => ({
    id: `h${level}`,
    icon: `h${level}` as EditorIconName,
    label: `Heading ${level}`,
    active: { name: 'heading', attrs: { level } },
    run: (e: Editor) => e.chain().focus().toggleHeading({ level }).run(),
  })),
  [
    {
      id: 'bulletList',
      icon: 'bulletList',
      label: 'Bullet list',
      active: { name: 'bulletList' },
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      icon: 'orderedList',
      label: 'Numbered list',
      active: { name: 'orderedList' },
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'taskList',
      icon: 'taskList',
      label: 'Task list',
      active: { name: 'taskList' },
      run: (e) => e.chain().focus().toggleTaskList().run(),
    },
  ],
  [
    {
      id: 'blockquote',
      icon: 'quote',
      label: 'Quote',
      active: { name: 'blockquote' },
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'codeBlock',
      icon: 'codeBlock',
      label: 'Code block',
      active: { name: 'codeBlock' },
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    { id: 'link', icon: 'link', label: 'Link', active: { name: 'link' }, run: () => openLink() },
  ],
]

const BUTTON_BASE = 'inline-flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors'
const BUTTON_ACTIVE = 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
const DIVIDER = 'mx-1 h-5 w-px shrink-0 bg-gray-200 dark:bg-gray-700'
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus-within:border-gray-400 dark:focus-within:border-gray-500 focus-within:bg-white dark:focus-within:bg-gray-800 focus-within:ring-2 focus-within:ring-gray-200 dark:focus-within:ring-gray-600 transition"
    :class="disabled ? 'opacity-60' : ''"
  >
    <div
      v-if="editor && !disabled"
      role="toolbar"
      :aria-label="`${ariaLabel} formatting`"
      class="flex flex-wrap items-center gap-0.5 border-b border-gray-200 dark:border-gray-700 px-1.5 py-1"
    >
      <template v-for="(group, index) in TOOL_GROUPS" :key="index">
        <span v-if="index > 0" :class="DIVIDER" aria-hidden="true" />
        <button
          v-for="item in group"
          :key="item.id"
          type="button"
          :title="item.label"
          :aria-label="item.label"
          :aria-pressed="item.active ? editor.isActive(item.active.name, item.active.attrs) : false"
          :class="[
            BUTTON_BASE,
            item.active && editor.isActive(item.active.name, item.active.attrs)
              ? BUTTON_ACTIVE
              : '',
          ]"
          @click="item.run(editor)"
        >
          <EditorIcon :name="item.icon" />
        </button>
      </template>

      <span class="ml-auto flex items-center gap-0.5">
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          :class="BUTTON_BASE"
          :disabled="!editor.can().undo()"
          @click="editor.chain().focus().undo().run()"
        >
          <EditorIcon name="undo" />
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          :class="BUTTON_BASE"
          :disabled="!editor.can().redo()"
          @click="editor.chain().focus().redo().run()"
        >
          <EditorIcon name="redo" />
        </button>
      </span>
    </div>

    <div
      v-if="linkOpen"
      class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5"
    >
      <label class="sr-only" for="note-link-url">Link URL</label>
      <input
        id="note-link-url"
        ref="linkInput"
        v-model="linkDraft"
        type="url"
        placeholder="example.com"
        class="min-w-0 flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
        @keydown.enter.prevent="applyLink()"
        @keydown.esc.prevent="linkOpen = false"
      />
      <button
        type="button"
        class="rounded-md bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white cursor-pointer transition-colors"
        @click="applyLink()"
      >
        Apply
      </button>
      <button
        type="button"
        class="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
        @click="clearLink()"
      >
        Remove
      </button>
    </div>

    <EditorContent :editor="editor" class="px-3 py-2" />
  </div>
</template>

<style scoped>
:deep(.ProseMirror ul[data-type='taskList']) {
  list-style: none;
  padding-left: 0;
}
:deep(.ProseMirror ul[data-type='taskList'] li) {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
:deep(.ProseMirror ul[data-type='taskList'] li > div) {
  flex: 1 1 auto;
  min-width: 0;
}
:deep(.ProseMirror ul[data-type='taskList'] li[data-checked='true'] p) {
  color: var(--color-gray-400);
  text-decoration: line-through;
}
:deep(.ProseMirror ul[data-type='taskList'] li > label) {
  display: flex;
  align-items: center;
  height: 1.5rem;
}
:deep(.ProseMirror ul[data-type='taskList'] input[type='checkbox']) {
  appearance: none;
  -webkit-appearance: none;
  width: 0.875rem;
  height: 0.875rem;
  margin: 0;
  border: 1px solid var(--color-gray-400);
  border-radius: 0.125rem;
  background-color: transparent;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}
:deep(.ProseMirror ul[data-type='taskList'] input[type='checkbox']:hover) {
  border-color: var(--color-gray-500);
}
:deep(.ProseMirror ul[data-type='taskList'] input[type='checkbox']:checked) {
  border-color: var(--color-gray-500);
  background-color: var(--color-gray-500);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fff' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 12 5 5L19 7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 0.625rem;
}
:deep(.ProseMirror ul[data-type='taskList'] input[type='checkbox']:focus-visible) {
  outline: 2px solid var(--color-gray-400);
  outline-offset: 1px;
}
</style>

<script setup lang="ts">
export type EditorIconName = 'bold' | 'italic' | 'strike' | 'code' | 'h1' | 'h2' | 'h3' | 'bulletList' | 'orderedList' | 'taskList' | 'quote' | 'codeBlock' | 'link' | 'undo' | 'redo'

defineProps<{ name: EditorIconName }>()

const HEADING_STEM = ['M4 12h8', 'M4 18V6', 'M12 18V6']

const PATHS: Record<EditorIconName, string[]> = {
  bold: ['M6 4h8a4 4 0 0 1 0 8H6z', 'M6 12h9a4 4 0 0 1 0 8H6z'],
  italic: ['M19 4h-9', 'M14 20H5', 'm15 4-6 16'],
  strike: ['M4 12h16', 'M16 6a4 4 0 0 0-4-2h-1a3 3 0 0 0-2.5 4.5', 'M8 18a4 4 0 0 0 4 2h1a3 3 0 0 0 2.5-4.5'],
  code: ['m16 18 6-6-6-6', 'm8 6-6 6 6 6'],
  h1: [...HEADING_STEM, 'm17 12 3-2v8'],
  h2: [...HEADING_STEM, 'M17 10a2 2 0 1 1 4 .5c0 1.5-4 2.5-4 5.5h4'],
  h3: [...HEADING_STEM, 'M17 10a2 2 0 1 1 2.5 3H19', 'M18.5 13a2.5 2.5 0 1 1-1.5 4.5'],
  bulletList: ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
  orderedList: [
    'M10 6h11',
    'M10 12h11',
    'M10 18h11',
    'M4 6h1v4',
    'M3.5 10h2.5',
    'M3.5 15.5A1.5 1.5 0 1 1 6 17l-2.5 2H6',
  ],
  taskList: [
    'M11 6h10',
    'M11 12h10',
    'M11 18h10',
    'm3 6.5 1.5 1.5L7 5.5',
    'm3 16.5 1.5 1.5L7 15.5',
  ],
  quote: ['M17 6H3', 'M21 12H8', 'M21 18H8', 'M3 12v6'],
  codeBlock: [
    'M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1',
    'M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1',
  ],
  link: [
    'M10 13a5 5 0 0 0 7.5.6l3-3a5 5 0 0 0-7-7L11.8 5.3',
    'M14 11a5 5 0 0 0-7.5-.6l-3 3a5 5 0 0 0 7 7l1.7-1.7',
  ],
  undo: ['M3 7v6h6', 'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.3 2.6L3 13'],
  redo: ['M21 7v6h-6', 'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.3 2.6L21 13'],
}
</script>

<template>
  <svg
    class="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, index) in PATHS[name]" :key="index" :d="d" />
  </svg>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { shortcutsHelpOpen } from '@/composables/useShortcutsHelp'

const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

// Single list, so the help is one place to update when a shortcut changes
const groups = [
  {
    label: 'General',
    items: [
      { keys: [mod, 'K'], text: 'Search the vault' },
      { keys: [mod, 'Alt', 'N'], text: 'New entry' },
      { keys: [mod, '/'], text: 'Show keyboard shortcuts' },
    ],
  },
  {
    label: 'Search results',
    items: [
      { keys: ['Enter'], text: 'Copy the selected result' },
      { keys: [mod, '↑ ↓'], text: 'Move the selection' },
      { keys: [mod, '1…9'], text: 'Copy the numbered result' },
    ],
  },
  {
    label: 'Entry form',
    items: [
      { keys: [mod, 'Enter'], text: 'Save' },
      { keys: ['Esc'], text: 'Cancel' },
    ],
  },
]

function close() {
  shortcutsHelpOpen.value = false
}

// Capture + stopPropagation so the entry form's own Esc handler does not also fire
function onKeydown(e: KeyboardEvent) {
  if (e.key === '/' && (e.ctrlKey || e.metaKey) && !e.altKey) {
    e.preventDefault()
    e.stopPropagation()
    shortcutsHelpOpen.value = !shortcutsHelpOpen.value
    return
  }
  if (shortcutsHelpOpen.value && e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <div
    v-if="shortcutsHelpOpen"
    class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard shortcuts"
    @click.self="close"
  >
    <div
      class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/6 dark:bg-gray-900 dark:ring-white/8"
    >
      <h2 class="mb-4 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
        Keyboard shortcuts
      </h2>
      <div class="space-y-5">
        <section v-for="g in groups" :key="g.label">
          <h3
            class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
          >
            {{ g.label }}
          </h3>
          <ul>
            <li
              v-for="item in g.items"
              :key="item.text"
              class="flex items-center justify-between gap-4 py-1.5 text-sm text-gray-700 dark:text-gray-300"
            >
              <span>{{ item.text }}</span>
              <span class="flex shrink-0 gap-1">
                <kbd
                  v-for="k in item.keys"
                  :key="k"
                  class="rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-gray-500 shadow-xs ring-1 ring-gray-900/10 dark:bg-white/6 dark:text-gray-400 dark:ring-white/10"
                >
                  {{ k }}
                </kbd>
              </span>
            </li>
          </ul>
        </section>
      </div>
      <div class="mt-5 flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-gray-900/5 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/9 cursor-pointer dark:bg-white/8 dark:text-gray-100 dark:hover:bg-white/12"
          @click="close"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

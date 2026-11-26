import { ref } from 'vue'

// Shared so the layout's Ctrl+/ handler, the modal and the entry form (which must not react to
// Esc/Ctrl+Enter while the help is on top) all see the same state
export const shortcutsHelpOpen = ref(false)

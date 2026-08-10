import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgVaultStore } from '@/stores/orgVault'

/**
 * Single-letter navigation shortcuts.
 *
 * Bare letters rather than modifier combos: Ctrl+N and Ctrl+Alt+N are claimed by the browser or
 * the desktop and never reach the page. Matched on `event.code` so they stay on the same physical
 * keys under non-US layouts, and ignored while the user is typing.
 */
export const NAV_SHORTCUTS: { code: string; key: string; to: string }[] = [
  { code: 'KeyA', key: 'A', to: '/vault' },
  { code: 'KeyP', key: 'P', to: '/passwords' },
  { code: 'KeyC', key: 'C', to: '/cards' },
  { code: 'KeyO', key: 'O', to: '/notes' },
  { code: 'KeyH', key: 'H', to: '/shared' },
  { code: 'KeyS', key: 'S', to: '/security' },
  { code: 'KeyN', key: 'N', to: '/vault/new' },
]

/** Shortcut key for a nav destination, for tooltips in the sidebar. */
export function shortcutFor(to: string): string | undefined {
  return NAV_SHORTCUTS.find((s) => s.to === to)?.key
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useNavShortcuts() {
  const router = useRouter()
  const sharedVault = useOrgVaultStore()

  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    if (isTyping(e.target)) return

    const shortcut = NAV_SHORTCUTS.find((s) => s.code === e.code)
    if (!shortcut) return
    // The Shared vault is only in the nav when the organization grants access
    if (shortcut.to === '/shared' && !sharedVault.hasAccess) return

    e.preventDefault()
    router.push(shortcut.to)
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
}

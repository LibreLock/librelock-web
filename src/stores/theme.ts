import { THEME_STORAGE_KEY } from '@/constants'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export type Theme = 'light' | 'dark'

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

function storedTheme(): Theme | null {
  const v = localStorage.getItem(THEME_STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : null
}

export const useThemeStore = defineStore('theme', () => {
  // Before login: browser choice, else OS theme
  // After login: the user's DB theme (adopt)
  const theme = ref<Theme>(storedTheme() ?? systemTheme())

  function apply() {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }

  function persistLocal() {
    localStorage.setItem(THEME_STORAGE_KEY, theme.value)
  }

  // Apply the signed-in user's saved theme without writing it back
  function adopt(next?: string | null) {
    if (next === 'light' || next === 'dark') {
      theme.value = next
      persistLocal()
      apply()
    }
  }

  function set(next: Theme) {
    theme.value = next
    persistLocal()
    apply()
    const auth = useAuthStore()
    if (auth.isAuthenticated) {
      apiRequest('/settings/theme', {
        method: 'PUT',
        body: JSON.stringify({ theme: next }),
      }).catch(() => {})
    }
  }

  function toggle() {
    set(theme.value === 'dark' ? 'light' : 'dark')
  }

  apply()
  return { theme, toggle, set, adopt }
})

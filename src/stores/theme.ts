import { THEME_STORAGE_KEY } from '@/constants'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((localStorage.getItem(THEME_STORAGE_KEY) as Theme) ?? 'dark')

  function apply() {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(THEME_STORAGE_KEY, theme.value)
    apply()
  }

  apply()
  return { theme, toggle }
})

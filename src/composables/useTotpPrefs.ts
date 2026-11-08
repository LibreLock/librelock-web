import { ref } from 'vue'
import { TOTP_SHOW_NEXT_STORAGE_KEY } from '@/constants'

// Per-device display preference, like the list sort order: it lives in localStorage rather than on
// the server, so it never touches the vault and each device can differ

function read(): boolean {
  try {
    return localStorage.getItem(TOTP_SHOW_NEXT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Whether codes also show the one that follows (Settings -> Account -> Authenticator). Off by default. */
export const showNextCode = ref(read())

export function setShowNextCode(on: boolean) {
  showNextCode.value = on
  try {
    localStorage.setItem(TOTP_SHOW_NEXT_STORAGE_KEY, on ? '1' : '0')
  } catch {
    // private mode or blocked storage: the choice still holds for this page load
  }
}

// Another tab flipped it
window.addEventListener('storage', (e) => {
  if (e.key === TOTP_SHOW_NEXT_STORAGE_KEY) showNextCode.value = e.newValue === '1'
})

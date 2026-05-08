import { ref, watch } from 'vue'

const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

export function usePasswordGenerator() {
  const length = ref(20)
  const useUppercase = ref(true)
  const useLowercase = ref(true)
  const useNumbers = ref(true)
  const useSymbols = ref(true)
  const generated = ref('')

  function generate() {
    let charset = ''
    if (useUppercase.value) charset += CHARS.uppercase
    if (useLowercase.value) charset += CHARS.lowercase
    if (useNumbers.value) charset += CHARS.numbers
    if (useSymbols.value) charset += CHARS.symbols
    if (!charset) {
      generated.value = ''
      return
    }
    const arr = new Uint32Array(length.value)
    crypto.getRandomValues(arr)
    generated.value = Array.from(arr, (n) => charset[n % charset.length]).join('')
  }

  watch([length, useUppercase, useLowercase, useNumbers, useSymbols], generate)
  generate()

  return { length, useUppercase, useLowercase, useNumbers, useSymbols, generated, generate }
}

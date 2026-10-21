<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePasswordGenerator } from '@/composables/usePasswordGenerator'
import { scoreSync } from '@/services/passwordStrength'
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter.vue'
import { PhArrowsClockwise } from '@phosphor-icons/vue'

const { length, useUppercase, useLowercase, useNumbers, useSymbols, generated, generate } =
  usePasswordGenerator()

const CHARSETS = [
  { label: 'Uppercase', model: useUppercase },
  { label: 'Lowercase', model: useLowercase },
  { label: 'Numbers', model: useNumbers },
  { label: 'Symbols', model: useSymbols },
]

const copied = ref(false)
const strength = computed(() => scoreSync(generated.value))

async function copy() {
  if (!generated.value) return
  await navigator.clipboard.writeText(generated.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div
    class="rounded-xl bg-white dark:bg-gray-900 shadow-xs ring-1 ring-gray-900/[0.06] dark:shadow-none dark:ring-white/[0.07] p-5 space-y-5 @container"
  >
    <div>
      <div class="flex gap-2">
        <div
          class="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.04] px-3 py-2 font-mono text-[15px] tracking-wide text-gray-900 dark:text-gray-100 truncate cursor-pointer transition-colors"
          :class="
            copied
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700'
              : ''
          "
          @click="copy"
          title="Copy"
        >
          {{ generated || '-' }}
        </div>
        <button
          type="button"
          title="Regenerate"
          class="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors cursor-pointer dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-200"
          @click="generate"
        >
          <PhArrowsClockwise :size="16" />
        </button>
        <button
          type="button"
          :disabled="!generated"
          class="shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :class="
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white'
          "
          @click="copy"
          title="Copy"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
      <PasswordStrengthMeter v-if="generated" :score="strength" class="mt-2.5" />
      <p v-else class="mt-1.5 text-xs text-red-500">Select at least one character type.</p>
    </div>

    <div>
      <div class="mb-2.5 flex items-baseline justify-between">
        <label
          for="generator-length"
          class="text-[13px] font-medium text-gray-700 dark:text-gray-300"
        >
          Length
        </label>
        <span class="text-[13px] font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {{ length }}
        </span>
      </div>
      <input
        id="generator-length"
        v-model.number="length"
        type="range"
        min="1"
        max="64"
        class="w-full slider"
        :style="{ '--slider-fill': `${((length - 1) / 63) * 100}%` }"
      />
    </div>

    <fieldset>
      <legend class="mb-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">
        Characters
      </legend>
      <div class="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <label
          v-for="opt in CHARSETS"
          :key="opt.label"
          class="flex cursor-pointer items-center gap-2.5 text-[13px] text-gray-900 dark:text-gray-100"
        >
          <input v-model="opt.model.value" type="checkbox" class="check" />
          {{ opt.label }}
        </label>
      </div>
    </fieldset>
  </div>
</template>

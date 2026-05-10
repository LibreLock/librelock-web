<script setup lang="ts">
import { ref } from 'vue'
import { usePasswordGenerator } from '@/composables/usePasswordGenerator'

const { length, useUppercase, useLowercase, useNumbers, useSymbols, generated, generate } =
  usePasswordGenerator()

const copied = ref(false)

async function copy() {
  if (!generated.value) return
  await navigator.clipboard.writeText(generated.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="max-w-xl">
      <h1 class="text-xl font-semibold text-slate-900 dark:text-slate-100">Password Generator</h1>
      <p class="mt-1 mb-5 text-sm text-slate-500">
        Generate strong, unique passwords for your accounts.
      </p>

      <div class="rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-5 space-y-5">
        <div>
          <div class="flex gap-2">
            <div
              class="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer transition-colors"
              :class="copied ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700' : ''"
              @click="copy"
              title="Copy"
            >
              {{ generated || '—' }}
            </div>
            <button
              type="button"
              title="Regenerate"
              class="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              @click="generate"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              :disabled="!generated"
              class="flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :class="
                copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
              "
              @click="copy"
              title="Copy"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <p v-if="!generated" class="mt-1.5 text-xs text-rose-500">
            Select at least one character type.
          </p>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-400"
              >Length:
              <span class="font-bold">{{ length }}</span>
            </label>
          </div>
          <input
            v-model.number="length"
            type="range"
            min="1"
            max="64"
            class="w-full slider"
            :style="{ '--slider-fill': `${((length - 1) / 63) * 100}%` }"
          />
        </div>

        <div>
          <label class="mb-2 block text-xs font-semibold text-slate-400">Characters used</label>
          <div class="grid grid-cols-2 gap-y-2">
            <label class="flex cursor-pointer items-center gap-2.5">
              <input
                v-model="useUppercase"
                type="checkbox"
                class="h-4 w-4 rounded accent-slate-800 cursor-pointer"
              />
              <span class="text-sm text-slate-700 dark:text-slate-300">Uppercase (A-Z)</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2.5">
              <input
                v-model="useLowercase"
                type="checkbox"
                class="h-4 w-4 rounded accent-slate-800 cursor-pointer"
              />
              <span class="text-sm text-slate-700 dark:text-slate-300">Lowercase (a-z)</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2.5">
              <input
                v-model="useNumbers"
                type="checkbox"
                class="h-4 w-4 rounded accent-slate-800 cursor-pointer"
              />
              <span class="text-sm text-slate-700 dark:text-slate-300">Numbers (0-9)</span>
            </label>
            <label class="flex cursor-pointer items-center gap-2.5">
              <input
                v-model="useSymbols"
                type="checkbox"
                class="h-4 w-4 rounded accent-slate-800 cursor-pointer"
              />
              <span class="text-sm text-slate-700 dark:text-slate-300">Symbols (!@#…)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

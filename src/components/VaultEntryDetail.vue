<script setup lang="ts">
import { ref } from 'vue'
import type { VaultEntry } from '@/api/vault'
import { useCategoriesStore } from '@/stores/categories'

const { entry } = defineProps<{
  entry: VaultEntry
}>()

const categoriesStore = useCategoriesStore()

const emit = defineEmits<{
  edit: []
}>()

const showPassword = ref(false)
const copiedField = ref<string | null>(null)

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copiedField.value = field
  setTimeout(() => {
    copiedField.value = null
  }, 2000)
}

function strengthLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 50) return 'Fair'
  return 'Weak'
}

function strengthColor(score: number): string {
  if (score >= 70) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

function strengthDot(score: number): string {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-rose-500'
}
</script>

<template>
  <div class="flex flex-1 flex-col overflow-y-auto">
    <div class="flex flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-4">
      <span
        class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
        :class="entry.color"
      >
        {{ entry.name.charAt(0).toUpperCase() }}
      </span>
      <div class="min-w-0 flex-1">
        <h1 class="text-xl font-semibold text-slate-900">{{ entry.name }}</h1>
        <a
          v-if="entry.type === 'password' && entry.url"
          :href="`https://${entry.url}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          {{ entry.url }}
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
        <span v-else-if="entry.type === 'password'" class="text-sm text-slate-500">Password</span>
        <span v-else-if="entry.type === 'note'" class="text-sm text-slate-500">Note</span>
        <span
          v-if="entry.categoryId"
          class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
        >
          {{ categoriesStore.getCategoryName(entry.categoryId) }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
        @click="emit('edit')"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Edit
      </button>
    </div>

    <div class="flex-1 space-y-5 p-6">
      <template v-if="entry.type === 'password'">
        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Credentials
          </h2>
          <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs text-slate-400">Username</p>
                <p class="truncate text-sm font-medium text-slate-800">
                  {{ entry.username || '—' }}
                </p>
              </div>
              <button
                v-if="entry.username"
                type="button"
                class="ml-3 flex-shrink-0 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                title="Copy username"
                @click="copy(entry.username, 'username')"
              >
                <svg
                  v-if="copiedField !== 'username'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <svg
                  v-else
                  class="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>

            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="min-w-0">
                <p class="text-xs text-slate-400">Email</p>
                <p class="truncate text-sm font-medium text-slate-800">
                  {{ entry.email || '—' }}
                </p>
              </div>
              <button
                v-if="entry.email"
                type="button"
                class="ml-3 flex-shrink-0 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                title="Copy email"
                @click="copy(entry.email, 'email')"
              >
                <svg
                  v-if="copiedField !== 'email'"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <svg
                  v-else
                  class="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>

            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="text-xs text-slate-400">Password</p>
                <p class="font-mono text-sm text-slate-800">
                  {{
                    showPassword ? entry.password : '•'.repeat(Math.min(entry.password.length, 18))
                  }}
                </p>
              </div>
              <div class="ml-3 flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  class="text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <svg
                    v-if="!showPassword"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="text-slate-400 transition-colors hover:text-slate-600 cursor-pointer"
                  title="Copy password"
                  @click="copy(entry.password, 'password')"
                >
                  <svg
                    v-if="copiedField !== 'password'"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <svg
                    v-else
                    class="h-4 w-4 text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Security
          </h2>
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-slate-200 bg-white p-4">
              <p class="mb-1.5 text-xs text-slate-400">Password strength</p>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 flex-shrink-0 rounded-full"
                  :class="strengthDot(entry.passwordStrength)"
                ></span>
                <span class="text-sm font-medium" :class="strengthColor(entry.passwordStrength)">
                  {{ strengthLabel(entry.passwordStrength) }} · {{ entry.passwordStrength }}/100
                </span>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-4">
              <p class="mb-1.5 text-xs text-slate-400">Reused</p>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 flex-shrink-0 rounded-full"
                  :class="entry.reused ? 'bg-amber-500' : 'bg-emerald-500'"
                ></span>
                <span class="text-sm font-medium text-slate-700">
                  {{ entry.reused ? 'Yes' : 'No' }}
                </span>
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-4">
              <p class="mb-1.5 text-xs text-slate-400">Breached</p>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 flex-shrink-0 rounded-full"
                  :class="entry.breached ? 'bg-rose-500' : 'bg-emerald-500'"
                ></span>
                <span class="text-sm font-medium text-slate-700">
                  {{ entry.breached ? 'Found in breach' : 'No known breaches' }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="entry.notes">
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Notes
          </h2>
          <div class="rounded-lg border border-slate-200 bg-white p-4">
            <p class="whitespace-pre-wrap text-sm text-slate-700">{{ entry.notes }}</p>
          </div>
        </section>
      </template>

      <template v-else>
        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Content
          </h2>
          <div class="rounded-lg border border-slate-200 bg-white p-4">
            <p class="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">
              {{ entry.content }}
            </p>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

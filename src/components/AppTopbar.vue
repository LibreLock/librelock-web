<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useVaultStore } from '@/stores/vault'

const vault = useVaultStore()

const searchInput = ref<HTMLInputElement | null>(null)

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

  if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !isTyping)) {
    e.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  }

  if (e.key === 'Escape' && document.activeElement === searchInput.value) {
    vault.globalSearch = ''
    searchInput.value?.blur()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header
    class="flex h-14 flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4"
  >
    <!-- Search bar -->
    <div class="relative w-full max-w-md">
      <svg
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      <input
        ref="searchInput"
        v-model="vault.globalSearch"
        type="search"
        placeholder="Search vault"
        class="w-full rounded-md border px-3 py-1 pl-9 pr-16 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition [&::-webkit-search-cancel-button]:hidden"
      />

      <!-- Ctrl+K hint -->
      <div
        class="absolute right-2.5 top-1/2 hidden -translate-y-1/2 py-0.5 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400 sm:block"
      >
        Ctrl K
      </div>

      <button
        v-if="vault.globalSearch"
        type="button"
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
        @click="vault.globalSearch = ''"
      >
        Clear
      </button>
    </div>

    <div class="ml-auto flex items-center gap-3">
      <RouterLink
        to="/vault/new"
        class="flex items-center justify-center gap-0 sm:gap-2 rounded-md bg-slate-800 p-2 sm:px-3 sm:py-1.5 text-white hover:bg-slate-700"
        aria-label="Add entry"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>

        <span class="hidden sm:inline text-sm font-semibold"> Add entry </span>
      </RouterLink>

      <button
        @click="$emit('toggle-theme')"
        class="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        aria-label="Toggle dark mode"
      >
        <svg
          v-if="$attrs.theme === 'light' || true"
          class="h-5 w-5 transition-transform duration-300 hover:rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.15" />

          <circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="1.8" />

          <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 2.5V4.5" />
            <path d="M12 19.5V21.5" />
            <path d="M2.5 12H4.5" />
            <path d="M19.5 12H21.5" />

            <path d="M18.36 5.64L16.95 7.05" />
            <path d="M7.05 16.95L5.64 18.36" />

            <path d="M18.36 18.36L16.95 16.95" />
            <path d="M7.05 7.05L5.64 5.64" />
          </g>
        </svg>
        <svg
          v-else
          class="h-[18px] w-[18px] transition-transform duration-300 hover:-rotate-6"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M21 12.8A8.5 8.5 0 1111.2 3 6.8 6.8 0 0021 12.8Z" />
        </svg>
      </button>
    </div>
  </header>
</template>

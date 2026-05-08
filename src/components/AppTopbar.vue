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
        class="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 [&::-webkit-search-cancel-button]:hidden"
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
    </div>
  </header>
</template>

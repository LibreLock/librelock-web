<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import AppBrand from '@/components/AppBrand.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const vault = useVaultStore()

const searchInput = ref<HTMLInputElement | null>(null)
const justCopied = ref(false)

async function handleKeydown(e: KeyboardEvent) {
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

  // Enter in the search box copies the top result's password/card number/note straight to clipboard
  if (
    e.key === 'Enter' &&
    document.activeElement === searchInput.value &&
    vault.globalSearch.trim()
  ) {
    e.preventDefault()
    if (await vault.copyFirstSearchResult()) {
      justCopied.value = true
      setTimeout(() => (justCopied.value = false), 1500)
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 sm:gap-4 sm:px-4"
  >
    <!-- The sidebar (and its logo) is hidden on mobile, so show the brand here -->
    <RouterLink to="/" class="shrink-0 md:hidden" aria-label="Home">
      <AppBrand size="md" :show-name="false" />
    </RouterLink>

    <div class="relative w-full max-w-xs lg:max-w-md">
      <svg
        class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
        class="w-full rounded-md border px-3 py-1.5 pl-9 pr-16 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition [&::-webkit-search-cancel-button]:hidden text-sm"
      />

      <div
        v-if="!vault.globalSearch"
        class="absolute right-2.5 top-1/2 hidden -translate-y-1/2 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 text-[10px] text-gray-400 dark:text-gray-500 sm:block"
      >
        Ctrl K
      </div>

      <span
        v-if="justCopied"
        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-500"
      >
        Copied!
      </span>

      <button
        v-else-if="vault.globalSearch"
        type="button"
        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
        @click="vault.globalSearch = ''"
        :title="vault.searchResults.length > 0 ? 'Press Enter to copy the top result' : undefined"
      >
        Clear
      </button>
    </div>

    <div class="ml-auto flex items-center gap-3">
      <RouterLink
        to="/vault/new"
        class="flex items-center justify-center gap-0 sm:gap-2 rounded-md bg-gray-800 p-2 sm:px-3 sm:py-1.5 text-white hover:bg-gray-700"
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

      <!-- On mobile the theme toggle lives in the bottom nav's More sheet -->
      <ThemeToggle class="hidden md:block" />
    </div>
  </header>
</template>

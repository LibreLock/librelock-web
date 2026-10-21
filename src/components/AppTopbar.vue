<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useVaultStore } from '@/stores/vault'
import AppBrand from '@/components/AppBrand.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { PhMagnifyingGlass, PhPlus } from '@phosphor-icons/vue'

const vault = useVaultStore()

const searchInput = ref<HTMLInputElement | null>(null)

// Hint the modifier people actually press: Cmd on Apple platforms, Ctrl everywhere else
const modKey = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

// Matched on code, since Alt/Shift rewrite e.key. The numpad counts too, as a way around
// desktops that grab the number row.
function digitIndex(code: string): number {
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(code)
  return match ? Number(match[1]) - 1 : -1
}

async function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  }

  if (e.key === 'Escape' && document.activeElement === searchInput.value) {
    vault.globalSearch = ''
    searchInput.value?.blur()
  }

  // Enter in the search box copies the selected result's password/card number/note straight to
  // clipboard — the top one until Ctrl+Arrow moves the selection
  if (
    e.key === 'Enter' &&
    document.activeElement === searchInput.value &&
    vault.globalSearch.trim()
  ) {
    e.preventDefault()
    vault.copySelectedSearchResult()
    return
  }

  // Ctrl/Cmd+1..9 copies the numbered result — bare digits would be swallowed from the query
  // ("Gmail 5"). Alt or Shift may ride along: a browser tab reserves plain Ctrl+digit for its own
  // tab switching (the installed PWA does not), so those combos are the fallback that reaches us.
  if ((e.ctrlKey || e.metaKey) && vault.globalSearch.trim()) {
    const n = digitIndex(e.code)
    if (n !== -1) {
      e.preventDefault()
      vault.copySearchResult(n)
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <header
    class="material relative z-10 flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 border-b border-gray-200/70 px-3 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-4 dark:border-white/[0.06]"
  >
    <!-- The sidebar (and its logo) is hidden on mobile, so show the brand here -->
    <RouterLink to="/" class="shrink-0 md:hidden" aria-label="Home">
      <AppBrand size="md" :show-name="false" />
    </RouterLink>

    <div class="relative w-full max-w-xs lg:max-w-md">
      <PhMagnifyingGlass
        :size="16"
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
      />

      <input
        ref="searchInput"
        v-model="vault.globalSearch"
        type="search"
        placeholder="Search vault"
        class="h-9 w-full rounded-lg border border-transparent bg-gray-900/[0.05] pl-8.5 pr-16 text-sm text-gray-900 placeholder:text-gray-500 transition-[background-color,border-color,box-shadow] duration-200 focus:border-gray-300 focus:bg-white focus:shadow-[0_0_0_3px_rgb(17_17_19/0.06)] focus:outline-none dark:bg-white/[0.07] dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-white/15 dark:focus:bg-gray-800 dark:focus:shadow-[0_0_0_3px_rgb(255_255_255/0.06)] [&::-webkit-search-cancel-button]:hidden"
      />

      <div
        v-if="!vault.globalSearch"
        class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-gray-500 shadow-xs ring-1 ring-gray-900/[0.06] sm:block dark:bg-white/[0.06] dark:text-gray-400 dark:ring-white/[0.06]"
      >
        {{ modKey }} K
      </div>

      <button
        v-if="vault.globalSearch"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-900/[0.05] hover:text-gray-800 dark:hover:bg-white/[0.08] dark:hover:text-gray-200 cursor-pointer"
        @click="vault.globalSearch = ''"
        :title="
          vault.copyableResults.length > 0
            ? 'Ctrl+↑/↓ walks the results, Enter copies the selected one, Ctrl+1…9 the numbered ones'
            : undefined
        "
      >
        Clear
      </button>
    </div>

    <RouterLink
      to="/vault/new"
      class="ml-auto flex h-9 shrink-0 items-center justify-center gap-0 rounded-lg bg-gray-900 px-2.5 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1),0_1px_2px_rgb(17_17_19/0.16)] hover:bg-gray-800 sm:gap-1.5 sm:pl-2.5 sm:pr-3.5 md:ml-0 dark:bg-gray-100 dark:text-gray-900 dark:shadow-none dark:hover:bg-white"
      aria-label="Add entry"
      title="Add entry"
    >
      <PhPlus :size="16" weight="bold" />

      <span class="hidden text-[13.5px] font-medium sm:inline">Add entry</span>
    </RouterLink>

    <!-- On mobile the theme toggle lives in the bottom nav's More sheet -->
    <ThemeToggle class="ml-auto hidden md:flex" />
  </header>
</template>

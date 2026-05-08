<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { VaultEntry } from '@/api/vault'
import { useVaultStore } from '@/stores/vault'
import { useCategoriesStore } from '@/stores/categories'
import CategoryPill from '@/components/CategoryPill.vue'

const props = defineProps<{
  entries: VaultEntry[]
  selectedId: string | null
  title: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const vault = useVaultStore()
const categoriesStore = useCategoriesStore()

onMounted(() => categoriesStore.fetchCategories())

const activeCategories = ref<Set<string>>(new Set())

const filtered = computed(() => {
  const q = vault.globalSearch.trim().toLowerCase()
  let list = props.entries

  if (q) {
    list = list.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true
      if (e.type === 'password') {
        return (
          e.username.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
        )
      }
      return false
    })
  }

  if (activeCategories.value.size > 0) {
    list = list.filter((e) => e.categoryId != null && activeCategories.value.has(e.categoryId))
  }

  return list
})

function entrySubtitle(entry: VaultEntry): string {
  if (entry.type === 'password') return entry.username || entry.email || '—'
  return 'Note'
}

function toggleCategory(id: string) {
  const next = new Set(activeCategories.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  activeCategories.value = next
}

function handleCategoryRemoved(id: string) {
  if (activeCategories.value.has(id)) {
    const next = new Set(activeCategories.value)
    next.delete(id)
    activeCategories.value = next
  }
}

const copiedId = ref<string | null>(null)

async function copyPassword(entry: VaultEntry) {
  if (entry.type !== 'password') return
  await navigator.clipboard.writeText(entry.password)
  copiedId.value = entry.id
  setTimeout(() => (copiedId.value = null), 2000)
}
</script>

<template>
  <aside class="flex w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
    <div class="flex-shrink-0 px-4 pb-1 pt-3">
      <h2 class="text-sm font-semibold text-slate-700">{{ title }}</h2>
      <span class="text-xs text-slate-400">
        {{ filtered.length }} item{{ filtered.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <div
      v-if="categoriesStore.categories.length > 0"
      class="flex-shrink-0 border-b border-slate-100 px-3 py-2"
    >
      <div class="flex flex-wrap gap-1">
        <button
          type="button"
          class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer"
          :class="
            activeCategories.size === 0
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          "
          @click="activeCategories = new Set()"
        >
          All
        </button>
        <CategoryPill
          v-for="category in categoriesStore.categories"
          :key="category.id"
          :category="category"
          :active="activeCategories.has(category.id)"
          @click="toggleCategory(category.id)"
          @removed="handleCategoryRemoved(category.id)"
        />
      </div>
    </div>

    <ul class="flex-1 overflow-y-auto">
      <li v-if="filtered.length === 0" class="px-4 py-8 text-center text-sm text-slate-400">
        No items found
      </li>
      <li v-for="entry in filtered" :key="entry.id" class="relative group">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 cursor-pointer"
          :class="[
            entry.id === selectedId ? 'bg-slate-100 hover:bg-slate-100' : '',
            entry.type === 'password' ? 'pr-10' : '',
          ]"
          @click="emit('select', entry.id)"
        >
          <span
            class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            :class="entry.color"
          >
            {{ entry.name.charAt(0).toUpperCase() }}
          </span>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="truncate text-sm font-medium text-slate-800">{{ entry.name }}</span>
            </div>
            <span class="block truncate text-xs text-slate-400">{{ entrySubtitle(entry) }}</span>
          </div>
        </button>

        <button
          v-if="entry.type === 'password'"
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
          :class="
            copiedId === entry.id
              ? 'text-emerald-500 opacity-100'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          "
          :title="copiedId === entry.id ? 'Copied!' : 'Copy password'"
          @click="copyPassword(entry)"
        >
          <svg
            v-if="copiedId !== entry.id"
            class="h-3.5 w-3.5"
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
          <svg v-else class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
      </li>
    </ul>
  </aside>
</template>

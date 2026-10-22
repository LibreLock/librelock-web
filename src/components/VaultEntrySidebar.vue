<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { VaultEntry } from '@/api/vault'
import { ssoLabel } from '@/services/sso'
import { useVaultStore } from '@/stores/vault'
import { useCategoriesStore } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import CategoryPill from '@/components/CategoryPill.vue'
import CardNetworkLogo from '@/components/CardNetworkLogo.vue'
import EntryIcon from '@/components/EntryIcon.vue'
import { SORT_OPTIONS, sortLabel, useEntrySort, type SortId } from '@/composables/useEntrySort'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import { useEntries } from '@/composables/useEntries'
import { toast } from '@/composables/useToast'
import {
  PhCaretDown,
  PhCheck,
  PhCopy,
  PhPencilSimple,
  PhSortAscending,
  PhTrash,
} from '@phosphor-icons/vue'

const props = withDefaults(
  defineProps<{
    entries: VaultEntry[]
    selectedId: string | null
    title: string
    sortKey: string
    shared?: boolean
    showTypeFilter?: boolean
  }>(),
  { shared: false, showTypeFilter: false },
)

const emit = defineEmits<{
  select: [id: string]
}>()

const vault = useVaultStore()
const categoriesStore = useCategoriesStore()
const orgCategoriesStore = useOrgCategoriesStore()
const auth = useAuthStore()
const orgStore = useOrganizationStore()
const route = useRoute()
const router = useRouter()
const entriesApi = useEntries()

// Filter chips draw from the store matching this sidebar's scope
// Shared categories take both shared-vault permissions (Organization -> Management -> Access)
const categoryList = computed(() =>
  props.shared ? orgCategoriesStore.categories : categoriesStore.categories,
)
const canEditCategories = computed(() =>
  props.shared ? auth.isAdmin || (orgStore.memberManageShared && orgStore.memberEditShared) : true,
)

onMounted(() => (props.shared ? orgCategoriesStore : categoriesStore).fetchCategories())

const activeCategories = ref<Set<string>>(new Set())

type TypeFilter = 'all' | 'password' | 'card' | 'note'
const typeFilter = ref<TypeFilter>('all')
const TYPE_FILTERS = ['all', 'password', 'card', 'note'] as const
const TYPE_FILTER_LABELS: Record<TypeFilter, string> = {
  all: 'All',
  password: 'Passwords',
  card: 'Cards',
  note: 'Notes',
}

const { sortId, setSort, sortEntries } = useEntrySort(props.sortKey)

const sortOpen = ref(false)

function chooseSort(value: SortId) {
  setSort(value)
  sortOpen.value = false
}

const filtered = computed(() => {
  const q = vault.globalSearch.trim().toLowerCase()
  let list = props.entries

  if (props.showTypeFilter && typeFilter.value !== 'all') {
    list = list.filter((e) => e.type === typeFilter.value)
  }

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

  return sortEntries(list)
})

const isSearching = computed(() => vault.globalSearch.trim().length > 0)

// A search looks across the whole vault: a category picked earlier would silently hide matches,
// so starting one drops the filter back to All
watch(isSearching, (searching) => {
  if (searching) activeCategories.value = new Set()
})

watchEffect(() =>
  vault.setVisibleResults(isSearching.value ? filtered.value : [], props.selectedId),
)
onUnmounted(() => vault.setVisibleResults([]))

function copyLabel(entry: VaultEntry): string {
  if (entry.type === 'card') return 'Copy card number'
  if (entry.type === 'note') return 'Copy note'
  return 'Copy password'
}

function entrySubtitle(entry: VaultEntry): string {
  if (entry.type === 'password') {
    if (entry.username || entry.email) return entry.username || entry.email
    if (entry.ssoProvider) return `${ssoLabel(entry.ssoProvider, entry.ssoLabel)} sign-in`
    return 'Password'
  }
  if (entry.type === 'card') {
    const digits = entry.cardNumber.replace(/\D/g, '')
    return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : 'Card'
  }
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

// Numbers only surface while Ctrl is down, so the list stays clean otherwise
const modifiersHeld = ref(false)

function syncModifiers(e: KeyboardEvent) {
  modifiersHeld.value = e.ctrlKey || e.metaKey
}

function releaseModifiers() {
  modifiersHeld.value = false
}

const listEl = ref<HTMLElement | null>(null)

// The walked entry can sit outside the scrolled viewport; nextTick lets the new selection render first
async function revealEntry(id: string) {
  await nextTick()
  listEl.value
    ?.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(id)}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}

// Ctrl/Cmd+Arrow walks the results as if each were clicked, so the hands stay on the keyboard
// between typing the query and reading the entry. Arrows only — Ctrl+1…9 stays the copy shortcut.
function handleArrowNav(e: KeyboardEvent) {
  if (!(e.ctrlKey || e.metaKey) || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
  if (!isSearching.value) return

  const list = filtered.value
  if (list.length === 0) return

  e.preventDefault()

  const step = e.key === 'ArrowDown' ? 1 : -1
  const current = list.findIndex((entry) => entry.id === props.selectedId)
  // Nothing selected yet (or the selection is filtered out): enter the list from the matching end
  const next =
    current === -1
      ? step === 1
        ? 0
        : list.length - 1
      : Math.min(Math.max(current + step, 0), list.length - 1)

  const target = list[next]
  if (!target) return

  emit('select', target.id)
  revealEntry(target.id)
}

// Right-click menu: the same actions the detail pane and form offer, one click closer
const MENU_WIDTH = 192
const MENU_HEIGHT = 128
const menu = ref<{ entry: VaultEntry; x: number; y: number } | null>(null)

// Mirrors the gates on the detail pane's Edit button and the form's Delete button
const canEditEntry = (entry: VaultEntry) =>
  !entry.shared || auth.isAdmin || orgStore.memberEditShared || orgStore.memberManageShared
const canDeleteEntry = (entry: VaultEntry) =>
  !entry.shared || auth.isAdmin || orgStore.memberManageShared

function openMenu(e: MouseEvent, entry: VaultEntry) {
  e.preventDefault()
  sortOpen.value = false
  menu.value = {
    entry,
    x: Math.max(8, Math.min(e.clientX, window.innerWidth - MENU_WIDTH - 8)),
    y: Math.max(8, Math.min(e.clientY, window.innerHeight - MENU_HEIGHT - 8)),
  }
}

function closeMenu() {
  menu.value = null
}

function menuCopy(entry: VaultEntry) {
  closeMenu()
  vault.copyEntry(entry)
}

function menuEdit(entry: VaultEntry) {
  closeMenu()
  router.push({ name: 'vault-edit', params: { id: entry.id } })
}

const pendingDelete = ref<VaultEntry | null>(null)
const isDeleting = ref(false)

function menuDelete(entry: VaultEntry) {
  closeMenu()
  pendingDelete.value = entry
}

// Passwords that sign in through the entry being deleted lose their link
const pendingLinkers = computed(() => {
  const target = pendingDelete.value
  if (!target || target.type !== 'password') return []
  return entriesApi.passwords.filter((e) => e.id !== target.id && e.ssoEntryId === target.id)
})

const deleteNoun = computed(() => pendingDelete.value?.type ?? 'entry')

async function confirmDelete() {
  const entry = pendingDelete.value
  if (!entry) return
  isDeleting.value = true
  try {
    await entriesApi.removeEntry(entry)
    // The open entry is gone: fall back to the list without a selection
    if (entry.id === props.selectedId && typeof route.name === 'string') {
      router.replace({ name: route.name.replace(/-entry$/, '') })
    }
    toast.success(`Deleted ${entry.name}`)
  } catch {
    toast.error(`Could not delete ${entry.name}`)
  } finally {
    isDeleting.value = false
    pendingDelete.value = null
  }
}

function handleKeydown(e: KeyboardEvent) {
  syncModifiers(e)
  if (e.key === 'Escape') {
    if (sortOpen.value) sortOpen.value = false
    if (menu.value) closeMenu()
    else if (pendingDelete.value && !isDeleting.value) pendingDelete.value = null
  }
  handleArrowNav(e)
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', syncModifiers)
  window.addEventListener('blur', releaseModifiers)
  window.addEventListener('resize', closeMenu)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', syncModifiers)
  window.removeEventListener('blur', releaseModifiers)
  window.removeEventListener('resize', closeMenu)
})

const showNumbers = computed(() => isSearching.value && modifiersHeld.value)
</script>

<template>
  <aside
    class="shrink-0 flex-col border-r border-gray-200/80 bg-white dark:border-white/[0.06] dark:bg-gray-900/60"
    :class="selectedId ? 'hidden sm:flex sm:w-72' : 'flex w-full sm:w-72'"
  >
    <!-- Header + filters share one bottom border so the divider is present even when there are no categories -->
    <div class="shrink-0">
      <div class="px-4 pb-2.5 pt-4">
        <h2 class="text-[17px] font-semibold text-gray-900 dark:text-gray-50">{{ title }}</h2>
        <div class="mt-0.5 flex items-center justify-between gap-2">
          <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">
            {{ filtered.length }} item{{ filtered.length !== 1 ? 's' : '' }}
          </span>

          <div class="relative">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
              :class="
                sortOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' : ''
              "
              :aria-expanded="sortOpen"
              aria-haspopup="menu"
              :title="`Sorted by ${sortLabel(sortId).toLowerCase()}`"
              @click="sortOpen = !sortOpen"
            >
              <PhSortAscending :size="14" class="shrink-0" aria-hidden="true" />
              <span>{{ sortLabel(sortId) }}</span>
              <PhCaretDown
                :size="12"
                weight="bold"
                class="shrink-0 transition-transform"
                :class="sortOpen ? 'rotate-180' : ''"
                aria-hidden="true"
              />
            </button>

            <template v-if="sortOpen">
              <div class="fixed inset-0 z-40" @click="sortOpen = false" />
              <div
                role="menu"
                class="absolute right-0 z-50 mt-1 w-44 origin-top-right overflow-hidden rounded-xl bg-white/95 p-1 shadow-lg ring-1 ring-gray-900/[0.07] backdrop-blur-xl dark:bg-gray-800/95 dark:ring-white/[0.08]"
              >
                <button
                  v-for="opt in SORT_OPTIONS"
                  :key="opt.value"
                  type="button"
                  role="menuitemradio"
                  :aria-checked="sortId === opt.value"
                  class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors"
                  :class="
                    sortId === opt.value
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.07]'
                  "
                  @click="chooseSort(opt.value)"
                >
                  <PhCheck
                    :size="14"
                    weight="bold"
                    class="shrink-0"
                    :class="sortId === opt.value ? 'opacity-100' : 'opacity-0'"
                    aria-hidden="true"
                  />
                  {{ opt.label }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Type selector: on mobile the "All" view absorbs Passwords/Cards/Notes, so switch between them here -->
      <div v-if="showTypeFilter" class="px-3 pb-3 md:hidden">
        <SegmentedTabs
          stretch
          size="sm"
          :tabs="TYPE_FILTERS"
          :labels="TYPE_FILTER_LABELS"
          :active="typeFilter"
          @select="typeFilter = $event"
        />
      </div>

      <div
        v-if="categoryList.length > 0"
        class="border-b border-gray-100 px-3 pb-3 dark:border-white/[0.05]"
      >
        <div class="flex flex-wrap gap-1">
          <button
            type="button"
            class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer"
            :class="
              activeCategories.size === 0
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-900/[0.05] text-gray-600 hover:bg-gray-900/[0.09] dark:bg-white/[0.07] dark:text-gray-300 dark:hover:bg-white/[0.12]'
            "
            @click="activeCategories = new Set()"
          >
            All
          </button>
          <CategoryPill
            v-for="category in categoryList"
            :key="category.id"
            :category="category"
            :active="activeCategories.has(category.id)"
            :use-org="shared"
            :can-edit="canEditCategories"
            @click="toggleCategory(category.id)"
            @removed="handleCategoryRemoved(category.id)"
          />
        </div>
      </div>
    </div>

    <ul ref="listEl" class="flex-1 space-y-px overflow-y-auto px-2 py-2">
      <li
        v-if="filtered.length === 0"
        class="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
      >
        No items found
      </li>
      <li
        v-for="(entry, index) in filtered"
        :key="entry.id"
        :data-entry-id="entry.id"
        class="relative group"
        :title="isSearching && index < 9 ? `Copy with Ctrl+${index + 1}` : undefined"
        @contextmenu="openMenu($event, entry)"
      >
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gray-900/[0.04] dark:hover:bg-white/[0.05] cursor-pointer"
          :class="[
            menu?.entry.id === entry.id && entry.id !== selectedId
              ? 'bg-gray-900/[0.04] dark:bg-white/[0.05]'
              : '',
            entry.id === selectedId
              ? 'bg-gray-900/[0.07] hover:bg-gray-900/[0.07] dark:bg-white/[0.1] dark:hover:bg-white/[0.1]'
              : '',
            'pr-10',
          ]"
          @click="emit('select', entry.id)"
        >
          <span
            v-if="entry.type === 'card'"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            :class="entry.network ? 'dark:bg-gray-700' : entry.color"
          >
            <CardNetworkLogo :network="entry.network" size="sm" />
          </span>
          <EntryIcon
            v-else
            :name="entry.name"
            :color="entry.color"
            :icon="entry.icon"
            :url="entry.type === 'password' ? entry.url : ''"
            size="sm"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{
                entry.name
              }}</span>
            </div>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{
              entrySubtitle(entry)
            }}</span>
          </div>
        </button>

        <button
          v-if="vault.canCopy(entry)"
          type="button"
          class="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md transition-all"
          :class="
            vault.copiedEntryId === entry.id
              ? 'opacity-100 text-emerald-500'
              : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:bg-gray-900/[0.06] dark:hover:bg-white/[0.08] hover:text-gray-700 dark:hover:text-gray-200'
          "
          :title="vault.copiedEntryId === entry.id ? 'Copied!' : copyLabel(entry)"
          @click="vault.copyEntry(entry)"
        >
          <PhCopy :size="14" v-if="vault.copiedEntryId !== entry.id" />
          <PhCheck :size="14" weight="bold" v-else />
        </button>

        <span
          v-if="showNumbers && index < 9"
          class="pointer-events-none absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-xs font-medium tabular-nums text-gray-400 transition-opacity"
          :class="vault.copiedEntryId === entry.id ? 'opacity-0' : 'group-hover:opacity-0'"
        >
          {{ index + 1 }}
        </span>
      </li>
    </ul>

    <Teleport to="body">
      <template v-if="menu">
        <div class="fixed inset-0 z-40" @click="closeMenu" @contextmenu.prevent="closeMenu" />
        <div
          role="menu"
          class="fixed z-50 w-48 overflow-hidden rounded-xl bg-white/95 p-1 shadow-lg ring-1 ring-gray-900/[0.07] backdrop-blur-xl dark:bg-gray-800/95 dark:ring-white/[0.08]"
          :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
        >
          <button
            v-if="vault.canCopy(menu.entry)"
            type="button"
            role="menuitem"
            class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.07]"
            @click="menuCopy(menu.entry)"
          >
            <PhCopy :size="14" class="shrink-0" aria-hidden="true" />
            {{ copyLabel(menu.entry) }}
          </button>
          <button
            v-if="canEditEntry(menu.entry)"
            type="button"
            role="menuitem"
            class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.07]"
            @click="menuEdit(menu.entry)"
          >
            <PhPencilSimple :size="14" class="shrink-0" aria-hidden="true" />
            Edit
          </button>
          <button
            v-if="canDeleteEntry(menu.entry)"
            type="button"
            role="menuitem"
            class="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            @click="menuDelete(menu.entry)"
          >
            <PhTrash :size="14" class="shrink-0" aria-hidden="true" />
            Delete
          </button>
        </div>
      </template>

      <div
        v-if="pendingDelete"
        class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
        @click.self="!isDeleting && (pendingDelete = null)"
      >
        <div
          class="max-w-sm w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
        >
          <h2 class="mb-1.5 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
            Delete {{ deleteNoun }}?
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            <span class="font-medium text-gray-700 dark:text-gray-200">{{
              pendingDelete.name
            }}</span>
            will be removed. This cannot be undone
          </p>
          <div
            v-if="pendingLinkers.length > 0"
            class="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
          >
            <p>
              {{ pendingLinkers.length }}
              {{ pendingLinkers.length === 1 ? 'entry signs' : 'entries sign' }} in through this one
              and will lose access to the password if you delete it:
            </p>
            <ul class="mt-1 list-inside list-disc">
              <li v-for="e in pendingLinkers" :key="e.id" class="truncate">{{ e.name }}</li>
            </ul>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg bg-gray-900/[0.05] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/[0.09] cursor-pointer disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]"
              :disabled="isDeleting"
              @click="pendingDelete = null"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
              :disabled="isDeleting"
              @click="confirmDelete"
            >
              {{ isDeleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

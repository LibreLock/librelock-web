<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useCategoriesStore, type VaultCategory } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'

const props = withDefaults(
  defineProps<{
    category: VaultCategory
    active: boolean
    // Manage the shared (org) category store instead of the personal one
    useOrg?: boolean
    // When false the right-click rename/delete menu is disabled (read-only)
    canEdit?: boolean
  }>(),
  { useOrg: false, canEdit: true },
)

const emit = defineEmits<{ click: []; removed: [] }>()

const personalStore = useCategoriesStore()
const orgStore = useOrgCategoriesStore()
const store = computed(() => (props.useOrg ? orgStore : personalStore))

const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)

function openMenu(e: MouseEvent) {
  e.preventDefault()
  if (!props.canEdit) return
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuOpen.value = true
  window.addEventListener('pointerdown', onWindowPointerDown)
}

function closeMenu() {
  menuOpen.value = false
  window.removeEventListener('pointerdown', onWindowPointerDown)
}

function onWindowPointerDown() {
  closeMenu()
}

const showRename = ref(false)
const renameName = ref('')
const isRenaming = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)

function startRename() {
  closeMenu()
  renameName.value = props.category.name
  showRename.value = true
  nextTick(() => renameInput.value?.select())
}

async function confirmRename() {
  const name = renameName.value.trim()
  if (!name || name === props.category.name) {
    showRename.value = false
    return
  }
  isRenaming.value = true
  try {
    await store.value.editCategory(props.category.id, name)
    showRename.value = false
  } finally {
    isRenaming.value = false
  }
}

const showDelete = ref(false)
const isDeleting = ref(false)

function startDelete() {
  closeMenu()
  showDelete.value = true
}

async function confirmDelete() {
  isDeleting.value = true
  try {
    await store.value.removeCategory(props.category.id)
    showDelete.value = false
    emit('removed')
  } finally {
    isDeleting.value = false
  }
}

onBeforeUnmount(closeMenu)
</script>

<template>
  <button
    type="button"
    class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer"
    :class="
      active
        ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    "
    @click="emit('click')"
    @contextmenu="openMenu"
  >
    {{ category.name }}
  </button>

  <Teleport to="body">
    <div
      v-if="menuOpen"
      class="fixed z-50 min-w-32.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg"
      :style="{ left: menuX + 'px', top: menuY + 'px' }"
      @pointerdown.stop
    >
      <button
        type="button"
        class="flex w-full items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        @click="startRename"
      >
        Rename
      </button>
      <button
        type="button"
        class="flex w-full items-center px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
        @click="startDelete"
      >
        Delete
      </button>
    </div>

    <div
      v-if="showRename"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      @click.self="showRename = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
        <h2 class="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
          Rename category
        </h2>
        <input
          ref="renameInput"
          v-model="renameName"
          type="text"
          class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
          @keydown.enter.prevent="confirmRename"
          @keydown.escape="showRename = false"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
            @click="showRename = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition-colors"
            :disabled="!renameName.trim() || isRenaming"
            @click="confirmRename"
          >
            {{ isRenaming ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDelete"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      @click.self="showDelete = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Delete "{{ category.name }}"?
        </h2>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Entries in this category won't be deleted, but they'll become uncategorized.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
            @click="showDelete = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
            :disabled="isDeleting"
            @click="confirmDelete"
          >
            {{ isDeleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useCategoriesStore, type VaultCategory } from '@/stores/categories'

const props = defineProps<{
  category: VaultCategory
  active: boolean
}>()

const emit = defineEmits<{ click: []; removed: [] }>()

const categoriesStore = useCategoriesStore()

const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)

function openMenu(e: MouseEvent) {
  e.preventDefault()
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
    await categoriesStore.editCategory(props.category.id, name)
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
    await categoriesStore.removeCategory(props.category.id)
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
        ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
    "
    @click="emit('click')"
    @contextmenu="openMenu"
  >
    {{ category.name }}
  </button>

  <Teleport to="body">
    <div
      v-if="menuOpen"
      class="fixed z-50 min-w-32.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1 shadow-lg"
      :style="{ left: menuX + 'px', top: menuY + 'px' }"
      @pointerdown.stop
    >
      <button
        type="button"
        class="flex w-full items-center px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
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
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-4 shadow-xl">
        <h2 class="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          Rename category
        </h2>
        <input
          ref="renameInput"
          v-model="renameName"
          type="text"
          class="w-full rounded-md border px-3 py-1.5 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-600 transition"
          @keydown.enter.prevent="confirmRename"
          @keydown.escape="showRename = false"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
            @click="showRename = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors"
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
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-slate-800 p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          Delete "{{ category.name }}"?
        </h2>
        <p class="mb-5 text-sm text-slate-500 dark:text-slate-400">
          Entries in this category won't be deleted, but they'll become uncategorized.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
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

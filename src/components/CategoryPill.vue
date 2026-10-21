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
    // The pill itself cannot be picked either. A separate prop because the template has two roots
    // (the button and its Teleport), so attribute fallthrough would drop a plain `disabled`
    disabled?: boolean
  }>(),
  { useOrg: false, canEdit: true, disabled: false },
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
    class="max-w-40 truncate rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
    :class="
      active
        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
        : 'bg-gray-900/[0.05] text-gray-600 hover:bg-gray-900/[0.09] dark:bg-white/[0.07] dark:text-gray-300 dark:hover:bg-white/[0.12]'
    "
    :disabled="disabled"
    @click="emit('click')"
    @contextmenu="openMenu"
  >
    {{ category.name }}
  </button>

  <Teleport to="body">
    <div
      v-if="menuOpen"
      class="fixed z-50 min-w-32.5 rounded-xl bg-white/95 p-1 shadow-lg ring-1 ring-gray-900/[0.07] backdrop-blur-xl dark:bg-gray-800/95 dark:ring-white/[0.08]"
      :style="{ left: menuX + 'px', top: menuY + 'px' }"
      @pointerdown.stop
    >
      <button
        type="button"
        class="flex w-full items-center rounded-lg px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
        @click="startRename"
      >
        Rename
      </button>
      <button
        type="button"
        class="flex w-full items-center rounded-lg px-2.5 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
        @click="startDelete"
      >
        Delete
      </button>
    </div>

    <div
      v-if="showRename"
      class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
      @click.self="showRename = false"
    >
      <div
        class="max-w-sm w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
      >
        <h2 class="mb-4 text-[17px] font-semibold text-gray-900 dark:text-gray-50">
          Rename category
        </h2>
        <input
          ref="renameInput"
          v-model="renameName"
          type="text"
          class="w-full rounded-lg border px-3 py-2 text-[15px] sm:text-sm border-gray-200 dark:border-white/10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-900/[0.06] dark:focus:border-white/25 dark:focus:ring-white/[0.06] transition"
          @keydown.enter.prevent="confirmRename"
          @keydown.escape="showRename = false"
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-gray-900/[0.05] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/[0.09] cursor-pointer disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]"
            @click="showRename = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
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
      class="fixed inset-0 z-50 flex items-center justify-center modal-scrim bg-gray-950/40 backdrop-blur-[2px] p-4 dark:bg-black/60"
      @click.self="showDelete = false"
    >
      <div
        class="max-w-sm w-full rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:ring-white/[0.08]"
      >
        <h2
          class="mb-1.5 wrap-break-word text-[17px] font-semibold text-gray-900 dark:text-gray-50"
        >
          Delete "{{ category.name }}"?
        </h2>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Entries in this category won't be deleted, but they'll become uncategorized.
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg bg-gray-900/[0.05] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-900/[0.09] cursor-pointer disabled:opacity-50 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.12]"
            @click="showDelete = false"
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
</template>

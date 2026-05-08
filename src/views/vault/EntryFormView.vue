<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { useCategoriesStore } from '@/stores/categories'
import { ENTRY_COLORS, DEFAULT_COLOR } from '@/api/vault'
import CategoryPill from '@/components/CategoryPill.vue'

const route = useRoute()
const router = useRouter()
const vault = useVaultStore()
const categoriesStore = useCategoriesStore()

const editId = route.params.id as string | undefined
const isEditMode = Boolean(editId)

type EntryType = 'password' | 'note'

const entryType = ref<EntryType>('password')
const selectedColor = ref(DEFAULT_COLOR)
const selectedCategoryId = ref<string | null>(null)
const showPassword = ref(false)

const account = reactive({
  name: '',
  username: '',
  email: '',
  password: '',
  url: '',
  notes: '',
})

const note = reactive({
  name: '',
  content: '',
})

const isSubmitting = ref(false)
const isLoading = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const error = ref<string | null>(null)

const showNewCategory = ref(false)
const newCategoryName = ref('')
const isAddingCategory = ref(false)

function generateStrongPassword() {
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  const arr = new Uint32Array(24)
  crypto.getRandomValues(arr)
  account.password = Array.from(arr, (n) => charset[n % charset.length]).join('')
}

onMounted(async () => {
  categoriesStore.fetchCategories()
  if (!isEditMode) return
  isLoading.value = true
  try {
    if (vault.entries.length === 0) await vault.fetchEntries()
    const entry = vault.getEntry(editId!)
    if (!entry) {
      error.value = 'Entry not found.'
      return
    }
    entryType.value = entry.type
    selectedColor.value = entry.color
    selectedCategoryId.value = entry.categoryId
    if (entry.type === 'password') {
      account.name = entry.name
      account.username = entry.username
      account.email = entry.email
      account.password = entry.password
      account.url = entry.url
      account.notes = entry.notes
    } else {
      note.name = entry.name
      note.content = entry.content
    }
  } catch {
    error.value = 'Failed to load entry.'
  } finally {
    isLoading.value = false
  }
})

function switchType(type: EntryType) {
  entryType.value = type
  error.value = null
}
function cancelNewCategory() {
  showNewCategory.value = false
  newCategoryName.value = ''
}

async function handleAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  isAddingCategory.value = true
  try {
    const cat = await categoriesStore.addCategory(name)
    selectedCategoryId.value = cat.id
    newCategoryName.value = ''
    showNewCategory.value = false
  } finally {
    isAddingCategory.value = false
  }
}

async function handleDelete() {
  isDeleting.value = true
  try {
    await vault.removeEntry(editId!)
    router.replace({ name: 'vault' })
  } finally {
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

async function handleSubmit() {
  error.value = null
  isSubmitting.value = true
  try {
    const shared = { color: selectedColor.value, categoryId: selectedCategoryId.value }
    if (isEditMode) {
      const payload =
        entryType.value === 'password'
          ? { type: 'password' as const, ...account, ...shared }
          : { type: 'note' as const, ...note, ...shared }
      const updated = await vault.editEntry(editId!, payload)
      router.push({ name: 'vault-entry', params: { id: updated.id } })
    } else {
      const payload =
        entryType.value === 'password'
          ? { type: 'password' as const, ...account, ...shared }
          : { type: 'note' as const, ...note, ...shared }
      const created = await vault.addEntry(payload)
      router.push({ name: 'vault-entry', params: { id: created.id } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save entry.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="w-full">
      <div class="mb-4 flex items-center gap-4">
        <div>
          <h1 class="text-xl font-semibold text-slate-900">
            {{ isEditMode ? 'Edit entry' : 'New' }}
          </h1>
        </div>

        <div v-if="!isEditMode" class="flex w-fit gap-1 rounded-lg bg-slate-100 p-1 flex-shrink-0">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              entryType === 'password'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            "
            @click="switchType('password')"
          >
            Password
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              entryType === 'note'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            "
            @click="switchType('note')"
          >
            Note
          </button>
        </div>

        <button
          v-if="isEditMode"
          type="button"
          class="ml-auto rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          @click="showDeleteConfirm = true"
        >
          Delete
        </button>
      </div>

      <div v-if="isLoading" class="py-12 text-center text-sm text-slate-400">Loading entry…</div>

      <div v-else class="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <form @submit.prevent="handleSubmit">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-slate-100">
            <div class="px-5 py-5 space-y-3">
              <template v-if="entryType === 'password'">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500"
                    >Name<span class="text-rose-400">*</span></label
                  >
                  <input
                    v-model="account.name"
                    type="text"
                    required
                    placeholder="e.g. GitHub"
                    class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-slate-500">Username</label>
                    <input
                      v-model="account.username"
                      type="text"
                      class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-slate-500">Email</label>
                    <input
                      v-model="account.email"
                      type="email"
                      class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    />
                  </div>
                </div>

                <div>
                  <div class="mb-1 flex items-center justify-between">
                    <label class="block text-xs font-semibold text-slate-500"
                      >Password<span class="text-rose-400">*</span></label
                    >
                    <button
                      type="button"
                      class="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      @click="generateStrongPassword"
                    >
                      Generate
                    </button>
                  </div>
                  <div class="relative">
                    <input
                      v-model="account.password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      autocomplete="new-password"
                      class="w-full rounded-md border px-3 py-1 pr-10 font-mono border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      @click="showPassword = !showPassword"
                    >
                      <svg
                        v-if="showPassword"
                        class="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                      <svg
                        v-else
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
                    </button>
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500">URL</label>
                  <input
                    v-model="account.url"
                    type="text"
                    placeholder="e.g. github.com"
                    class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500">Notes</label>
                  <textarea
                    v-model="account.notes"
                    rows="3"
                    class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>
              </template>

              <template v-else>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500"
                    >Name<span class="text-rose-400">*</span></label
                  >
                  <input
                    v-model="note.name"
                    type="text"
                    required
                    placeholder="e.g. Recovery codes"
                    class="w-full rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-slate-500"
                    >Content<span class="text-rose-400">*</span></label
                  >
                  <textarea
                    v-model="note.content"
                    rows="8"
                    required
                    class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                  />
                </div>
              </template>
            </div>

            <div class="flex flex-col gap-5 px-5 py-5 border-t border-slate-100 lg:border-t-0">
              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-500">Color</label>

                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="c in ENTRY_COLORS"
                    :key="c.bg"
                    type="button"
                    class="h-6 w-6 rounded-full transition-transform cursor-pointer"
                    :class="[
                      c.bg,
                      selectedColor === c.bg
                        ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                        : 'hover:scale-105',
                    ]"
                    :title="c.label"
                    @click="selectedColor = c.bg"
                  />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-slate-500">Category</label>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer"
                    :class="
                      selectedCategoryId === null
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    "
                    @click="selectedCategoryId = null"
                  >
                    None
                  </button>
                  <CategoryPill
                    v-for="cat in categoriesStore.categories"
                    :key="cat.id"
                    :category="cat"
                    :active="selectedCategoryId === cat.id"
                    @click="selectedCategoryId = cat.id"
                    @removed="
                      selectedCategoryId = selectedCategoryId === cat.id ? null : selectedCategoryId
                    "
                  />
                  <button
                    v-if="!showNewCategory"
                    type="button"
                    class="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    @click="showNewCategory = true"
                  >
                    + New
                  </button>
                </div>

                <div v-if="showNewCategory" class="mt-2 flex gap-1.5">
                  <input
                    v-model="newCategoryName"
                    type="text"
                    placeholder="Name"
                    class="min-w-0 flex-1 rounded-md border px-3 py-1 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition"
                    @keydown.enter.prevent="handleAddCategory"
                    @keydown.escape="cancelNewCategory"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                    :disabled="!newCategoryName.trim() || isAddingCategory"
                    @click="handleAddCategory"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                    @click="cancelNewCategory"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div class="flex-1" />

              <div>
                <p v-if="error" class="mb-2 text-xs text-rose-600">{{ error }}</p>
                <button
                  type="submit"
                  class="w-full rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  :disabled="isSubmitting"
                >
                  {{ isSubmitting ? 'Saving…' : isEditMode ? 'Save changes' : 'Save entry' }}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showDeleteConfirm = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-slate-900">
          Delete {{ entryType === 'password' ? 'password' : 'note' }}?
        </h2>
        <p class="mb-5 text-sm text-slate-500">This cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer transition-colors"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            {{ isDeleting ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

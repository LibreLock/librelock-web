<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { useCategoriesStore } from '@/stores/categories'
import CategoryPill from '@/components/CategoryPill.vue'
import CardNetworkLogo from '@/components/CardNetworkLogo.vue'
import EntryIcon from '@/components/EntryIcon.vue'
import { usePasswordGenerator } from '@/composables/usePasswordGenerator'
import { DEFAULT_COLOR, ENTRY_COLORS } from '@/constants'
import { detectCardNetwork } from '@/api/vault'
import { ICON_CATALOG } from '@/icons/catalog'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const vault = useVaultStore()
const categoriesStore = useCategoriesStore()

const editId = route.params.id as string | undefined
const isEditMode = Boolean(editId)

type EntryType = 'password' | 'note' | 'card'

const entryType = ref<EntryType>('password')
const selectedColor = ref(DEFAULT_COLOR)
const selectedIcon = ref<string | null>(null)
const selectedCategoryId = ref<string | null>(null)

// Name/url used to preview brand auto-detection when no icon is chosen.
const iconName = computed(() =>
  entryType.value === 'password'
    ? account.name
    : entryType.value === 'note'
      ? note.name
      : card.name,
)
const iconUrl = computed(() => (entryType.value === 'password' ? account.url : ''))

type IconTab = 'all' | 'brands' | 'general'
const ICON_TABS: { id: IconTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'brands', label: 'Brands' },
  { id: 'general', label: 'General' },
]
const iconTab = ref<IconTab>('brands')
const iconSearch = ref('')
const filteredIcons = computed(() => {
  const q = iconSearch.value.trim().toLowerCase()
  return ICON_CATALOG.filter((ic) => {
    if (iconTab.value === 'brands' && ic.group !== 'Brands') return false
    if (iconTab.value === 'general' && ic.group !== 'General') return false
    if (!q) return true
    return ic.label.toLowerCase().includes(q) || ic.keywords.some((k) => k.includes(q))
  })
})

watch(
  () => categoriesStore.categories,
  (cats) => {
    if (selectedCategoryId.value && !cats.some((c) => c.id === selectedCategoryId.value)) {
      selectedCategoryId.value = null
    }
  },
)

const showPassword = ref(false)
const showCvv = ref(false)

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

const card = reactive({
  name: '',
  cardholderName: '',
  cardNumber: '',
  expiration: '',
  cvv: '',
  notes: '',
})

const cardNetwork = computed(() => detectCardNetwork(card.cardNumber))

function handleCardNumberInput(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 16)
  card.cardNumber = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  input.value = card.cardNumber
}

function handleExpiryInput(e: Event) {
  const input = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 4)
  card.expiration = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
  input.value = card.expiration
}

const isSubmitting = ref(false)
const isLoading = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const error = ref<string | null>(null)

const showNewCategory = ref(false)
const newCategoryName = ref('')
const isAddingCategory = ref(false)

const { generated, generate } = usePasswordGenerator()

function generateStrongPassword() {
  generate()
  account.password = generated.value
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
    selectedIcon.value = entry.icon
    selectedCategoryId.value = entry.categoryId
    if (entry.type === 'password') {
      account.name = entry.name
      account.username = entry.username
      account.email = entry.email
      account.password = entry.password
      account.url = entry.url
      account.notes = entry.notes
    } else if (entry.type === 'card') {
      card.name = entry.name
      card.cardholderName = entry.cardholderName
      card.cardNumber = entry.cardNumber
      card.expiration = entry.expiration
      card.cvv = entry.cvv
      card.notes = entry.notes
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
    const shared = {
      color: selectedColor.value,
      icon: selectedIcon.value,
      categoryId: selectedCategoryId.value,
    }
    let payload
    if (entryType.value === 'password') {
      payload = { type: 'password' as const, ...account, ...shared }
    } else if (entryType.value === 'card') {
      payload = { type: 'card' as const, ...card, ...shared }
    } else {
      payload = { type: 'note' as const, ...note, ...shared }
    }
    if (isEditMode) {
      const updated = await vault.editEntry(editId!, payload)
      router.push({ name: 'vault-entry', params: { id: updated.id } })
    } else {
      const created = await vault.addEntry(payload)
      router.push({ name: 'vault-entry', params: { id: created.id } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save entry'
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
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ isEditMode ? 'Edit entry' : 'New' }}
          </h1>
        </div>

        <div
          v-if="!isEditMode"
          class="flex w-fit gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 shrink-0"
        >
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              entryType === 'password'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            @click="switchType('password')"
          >
            Password
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              entryType === 'card'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            @click="switchType('card')"
          >
            Card
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              entryType === 'note'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            @click="switchType('note')"
          >
            Secure Note
          </button>
        </div>

        <button
          v-if="isEditMode"
          type="button"
          class="ml-auto rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          @click="showDeleteConfirm = true"
        >
          Delete
        </button>
      </div>

      <div
        v-if="isLoading"
        class="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-400"
      >
        <LoadingSpinner class="text-gray-400" />
        Loading entry…
      </div>

      <div
        v-else
        class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden"
      >
        <form @submit.prevent="handleSubmit">
          <div
            class="grid grid-cols-1 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-gray-100 dark:lg:divide-gray-700"
          >
            <div class="px-5 py-5 space-y-3">
              <template v-if="entryType === 'password'">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Name<span class="text-red-400">*</span></label
                  >
                  <input
                    v-model="account.name"
                    type="text"
                    required
                    placeholder="GitHub"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Username</label
                    >
                    <input
                      v-model="account.username"
                      type="text"
                      class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Email</label
                    >
                    <input
                      v-model="account.email"
                      type="email"
                      class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <div class="mb-1 flex items-center">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Password<span class="text-red-400">*</span></label
                    >
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 px-1"
                      >—</span
                    >
                    <button
                      type="button"
                      class="text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer hover:underline"
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
                      class="w-full rounded-md border px-3 py-1.5 pr-10 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
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
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >URL</label
                  >
                  <input
                    v-model="account.url"
                    type="text"
                    placeholder="github.com"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Secure notes</label
                  >
                  <textarea
                    v-model="account.notes"
                    rows="3"
                    class="w-full resize-y field-sizing-content min-h-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>
              </template>

              <!-- Card form -->
              <template v-else-if="entryType === 'card'">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Name<span class="text-red-400">*</span></label
                  >
                  <input
                    v-model="card.name"
                    type="text"
                    required
                    placeholder="N26 Metal"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Cardholder name</label
                  >
                  <input
                    v-model="card.cardholderName"
                    type="text"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Card number<span class="text-red-400">*</span></label
                  >
                  <div class="relative">
                    <input
                      :value="card.cardNumber"
                      type="text"
                      required
                      inputmode="numeric"
                      placeholder="1234 5678 9012 3456"
                      class="w-full rounded-md border px-3 py-1.5 pr-10 font-mono tracking-wider border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                      @input="handleCardNumberInput"
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2">
                      <CardNetworkLogo :network="cardNetwork" size="sm" />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >Expiration<span class="text-red-400">*</span></label
                    >
                    <input
                      :value="card.expiration"
                      type="text"
                      required
                      inputmode="numeric"
                      placeholder="MM/YY"
                      maxlength="5"
                      class="w-full rounded-md border px-3 py-1.5 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                      @input="handleExpiryInput"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                      >CVV<span class="text-red-400">*</span></label
                    >
                    <div class="relative">
                      <input
                        v-model="card.cvv"
                        :type="showCvv ? 'text' : 'password'"
                        required
                        inputmode="numeric"
                        placeholder="•••"
                        maxlength="4"
                        class="w-full rounded-md border px-3 py-1.5 pr-10 font-mono border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                      />
                      <button
                        type="button"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                        @click="showCvv = !showCvv"
                      >
                        <svg
                          v-if="showCvv"
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
                </div>

                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Notes</label
                  >
                  <textarea
                    v-model="card.notes"
                    rows="3"
                    class="w-full resize-y field-sizing-content min-h-20 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>
              </template>

              <template v-else>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Name<span class="text-red-400">*</span></label
                  >
                  <input
                    v-model="note.name"
                    type="text"
                    required
                    placeholder="Recovery codes"
                    class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Content<span class="text-red-400">*</span></label
                  >
                  <textarea
                    v-model="note.content"
                    rows="8"
                    required
                    class="w-full resize-y field-sizing-content min-h-44 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 font-mono text-sm text-gray-900 dark:text-gray-100 focus:border-gray-400 dark:focus:border-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                  />
                </div>
              </template>
            </div>

            <div
              class="flex flex-col gap-5 px-5 py-5 border-t border-gray-100 dark:border-gray-700 lg:border-t-0"
            >
              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >Color</label
                >
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="c in ENTRY_COLORS"
                    :key="c.bg"
                    type="button"
                    class="h-6 w-6 rounded-full transition-transform cursor-pointer"
                    :class="[
                      c.bg,
                      selectedColor === c.bg
                        ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110'
                        : 'hover:scale-105',
                    ]"
                    :title="c.label"
                    @click="selectedColor = c.bg"
                  />
                </div>
              </div>

              <div v-if="entryType !== 'card'">
                <div class="mb-1 flex items-center gap-2">
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400"
                    >Icon</label
                  >
                  <EntryIcon
                    v-if="iconName || selectedIcon"
                    :name="iconName"
                    :color="selectedColor"
                    :icon="selectedIcon"
                    :url="iconUrl"
                    size="sm"
                    class="!h-7 !w-7 !rounded-md !text-xs"
                  />
                </div>
                <input
                  v-model="iconSearch"
                  type="text"
                  placeholder="Search icons…"
                  class="mb-1.5 w-full rounded-md border px-3 py-1.5 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                />
                <div class="mb-1.5 flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                  <button
                    v-for="tab in ICON_TABS"
                    :key="tab.id"
                    type="button"
                    class="flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer"
                    :class="
                      iconTab === tab.id
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    "
                    @click="iconTab = tab.id"
                  >
                    {{ tab.label }}
                  </button>
                </div>
                <div
                  class="grid max-h-40 grid-cols-7 gap-1.5 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 p-2"
                >
                  <button
                    v-if="!iconSearch.trim()"
                    type="button"
                    class="col-span-2 flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                    :class="
                      selectedIcon === null
                        ? 'border-gray-800 dark:border-gray-100 text-gray-800 dark:text-gray-100'
                        : 'border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    "
                    title="Auto — detect brand or use the first letter"
                    @click="selectedIcon = null"
                  >
                    Auto
                  </button>
                  <button
                    v-for="ic in filteredIcons"
                    :key="ic.id"
                    type="button"
                    class="flex aspect-square w-full items-center justify-center rounded-md border transition-colors cursor-pointer"
                    :class="
                      selectedIcon === ic.id
                        ? 'border-gray-800 ring-1 ring-gray-800 dark:border-gray-100 dark:ring-gray-100'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    "
                    :title="ic.label"
                    @click="selectedIcon = ic.id"
                  >
                    <svg
                      class="h-4 w-4 text-gray-600 dark:text-gray-300"
                      viewBox="0 0 24 24"
                      :fill="ic.mode === 'fill' ? 'currentColor' : 'none'"
                      :fill-rule="ic.fillRule ?? 'nonzero'"
                      :stroke="
                        ic.mode === 'stroke' || (ic.mode === 'fill' && ic.strokeWidth)
                          ? 'currentColor'
                          : 'none'
                      "
                      :stroke-width="ic.mode === 'stroke' ? 2 : (ic.strokeWidth ?? 0)"
                      aria-hidden="true"
                    >
                      <path
                        v-for="(d, i) in ic.paths"
                        :key="i"
                        :d="d"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <p
                    v-if="filteredIcons.length === 0"
                    class="col-span-full py-3 text-center text-xs text-gray-400"
                  >
                    No icons match “{{ iconSearch.trim() }}”
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
                  >Category</label
                >
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer"
                    :class="
                      selectedCategoryId === null
                        ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    class="rounded-full border border-dashed border-gray-300 dark:border-gray-600 px-2.5 py-0.5 text-xs font-medium text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
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
                    class="min-w-0 flex-1 rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                    @keydown.enter.prevent="handleAddCategory"
                    @keydown.escape="cancelNewCategory"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                    :disabled="!newCategoryName.trim() || isAddingCategory"
                    @click="handleAddCategory"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
                    @click="cancelNewCategory"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div class="flex-1" />

              <div>
                <p v-if="error" class="mb-2 text-xs text-red-600">{{ error }}</p>
                <button
                  type="submit"
                  class="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  :disabled="isSubmitting"
                >
                  <LoadingSpinner v-if="isSubmitting" size="sm" />
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60"
      @click.self="showDeleteConfirm = false"
    >
      <div class="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-4 shadow-xl">
        <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Delete
          {{ entryType === 'password' ? 'password' : entryType === 'card' ? 'card' : 'note' }}?
        </h2>
        <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">This cannot be undone</p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
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

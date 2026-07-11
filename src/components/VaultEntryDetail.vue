<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { VaultEntry } from '@/api/vault'
import { useCategoriesStore } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'
import { useVaultStore } from '@/stores/vault'
import CardNetworkLogo from '@/components/CardNetworkLogo.vue'
import EntryIcon from '@/components/EntryIcon.vue'

const { entry } = defineProps<{
  entry: VaultEntry
}>()

const categoriesStore = useCategoriesStore()
const orgCategoriesStore = useOrgCategoriesStore()
const vault = useVaultStore()

// Shared entries resolve their category name from the org store
const categoryName = computed(() =>
  entry.shared
    ? orgCategoriesStore.getCategoryName(entry.categoryId)
    : categoriesStore.getCategoryName(entry.categoryId),
)

const emit = defineEmits<{
  edit: []
  back: []
}>()

const showPassword = ref(false)
const showCardNumber = ref(false)
const showCvv = ref(false)
const copiedField = ref<string | null>(null)
const showReusedTooltip = ref(false)

const maskedCardNumber = computed(() => {
  if (entry.type !== 'card') return ''
  const digits = entry.cardNumber.replace(/\D/g, '')
  const masked = '•'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4)
  return masked.replace(/(.{4})/g, '$1 ').trim()
})

const isReused = computed(() =>
  entry.type === 'password' ? vault.isPasswordReused(entry.password) : false,
)

const reusedWith = computed(() =>
  entry.type === 'password' ? vault.getReusedWith(entry.password, entry.id) : [],
)

const isBreachChecking = computed(() => vault.breachCheckingIds.has(entry.id))

function triggerBreachCheck() {
  if (entry.type === 'password') vault.checkEntryBreach(entry)
}

onMounted(triggerBreachCheck)
watch(() => entry.id, triggerBreachCheck)

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copiedField.value = field
  setTimeout(() => {
    copiedField.value = null
  }, 2000)
}

function strengthLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= 7) return 'Strong'
  if (score >= 5) return 'Fair'
  return 'Weak'
}

function strengthColor(score: number): string {
  if (score >= 7) return 'text-emerald-600'
  if (score >= 5) return 'text-amber-600'
  return 'text-red-600'
}

function strengthDot(score: number): string {
  if (score >= 7) return 'bg-emerald-500'
  if (score >= 5) return 'bg-amber-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="flex flex-1 flex-col overflow-y-auto">
    <button
      type="button"
      class="sm:hidden flex items-center gap-1 px-4 pt-3 pb-1 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 w-full transition-colors cursor-pointer"
      @click="emit('back')"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div
      class="flex shrink-0 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4"
    >
      <span
        v-if="entry.type === 'card'"
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        :class="entry.network ? 'dark:bg-gray-700' : entry.color"
      >
        <CardNetworkLogo :network="entry.network" size="md" />
      </span>
      <EntryIcon
        v-else
        :name="entry.name"
        :color="entry.color"
        :icon="entry.icon"
        :url="entry.type === 'password' ? entry.url : ''"
        size="md"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h1 class="truncate text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ entry.name }}
          </h1>
          <span
            v-if="entry.shared"
            class="shrink-0 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold"
          >
            Shared
          </span>
        </div>
        <a
          v-if="entry.type === 'password' && entry.url"
          :href="`https://${entry.url}`"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {{ entry.url }}
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
        <span v-else-if="entry.type === 'password'" class="text-sm text-gray-500">Password</span>
        <span v-else-if="entry.type === 'note'" class="text-sm text-gray-500">Secure Note</span>
        <span v-else-if="entry.type === 'card'" class="text-sm text-gray-500">Credit Card</span>
        <span
          v-if="entry.categoryId"
          class="ml-2 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300"
        >
          {{ categoryName }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        @click="emit('edit')"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        Edit
      </button>
    </div>

    <div class="flex-1 space-y-5 p-6">
      <template v-if="entry.type === 'password'">
        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Credentials
          </h2>
          <div
            class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-400">Username</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.username || '-' }}
                </p>
              </div>
              <button
                v-if="entry.username"
                type="button"
                class="ml-3 shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title="Copy username"
                @click="copy(entry.username, 'username')"
              >
                <svg
                  v-if="copiedField !== 'username'"
                  class="h-4 w-4"
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
                <svg
                  v-else
                  class="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>

            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-400">Email</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.email || '-' }}
                </p>
              </div>
              <button
                v-if="entry.email"
                type="button"
                class="ml-3 shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title="Copy email"
                @click="copy(entry.email, 'email')"
              >
                <svg
                  v-if="copiedField !== 'email'"
                  class="h-4 w-4"
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
                <svg
                  v-else
                  class="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>

            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-400">Password</p>
                <p class="font-mono text-sm text-gray-800 dark:text-gray-200">
                  {{
                    showPassword ? entry.password : '•'.repeat(Math.min(entry.password.length, 18))
                  }}
                </p>
              </div>
              <div class="ml-3 flex shrink-0 gap-2">
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  <svg
                    v-if="!showPassword"
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
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Copy password"
                  @click="copy(entry.password, 'password')"
                >
                  <svg
                    v-if="copiedField !== 'password'"
                    class="h-4 w-4"
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
                  <svg
                    v-else
                    class="h-4 w-4 text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Security
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div
              class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
            >
              <p class="mb-1.5 text-xs text-gray-400">Password strength</p>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="strengthDot(entry.passwordStrength)"
                ></span>
                <span class="text-sm font-medium" :class="strengthColor(entry.passwordStrength)">
                  {{ strengthLabel(entry.passwordStrength) }} · {{ entry.passwordStrength }}/10
                </span>
              </div>
            </div>

            <div
              class="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
              @mouseenter="showReusedTooltip = true"
              @mouseleave="showReusedTooltip = false"
            >
              <p class="mb-1.5 text-xs text-gray-400">Reused</p>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="isReused ? 'bg-red-500' : 'bg-emerald-500'"
                ></span>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ isReused ? 'Yes' : 'No' }}
                </span>
              </div>

              <div
                v-if="showReusedTooltip && isReused && reusedWith.length > 0"
                class="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-lg"
              >
                <p class="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Also used by
                </p>
                <ul class="space-y-0.5">
                  <li
                    v-for="e in reusedWith"
                    :key="e.id"
                    class="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"
                  >
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
                    {{ e.name }}
                  </li>
                </ul>
              </div>
            </div>

            <div
              class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
            >
              <p class="mb-1.5 text-xs text-gray-400">Breached</p>
              <div class="flex items-center gap-1.5">
                <template v-if="isBreachChecking">
                  <span
                    class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600"
                  ></span>
                  <span class="text-sm font-medium text-gray-400 dark:text-gray-500"
                    >Checking…</span
                  >
                </template>
                <template v-else>
                  <span
                    class="h-2 w-2 shrink-0 rounded-full"
                    :class="entry.breached ? 'bg-red-500' : 'bg-emerald-500'"
                  ></span>
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ entry.breached ? 'Found in breach' : 'No known breaches' }}
                  </span>
                </template>
              </div>
            </div>
          </div>
        </section>

        <section v-if="entry.notes">
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Notes
          </h2>
          <div
            class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
          >
            <p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {{ entry.notes }}
            </p>
          </div>
        </section>
      </template>

      <template v-else-if="entry.type === 'card'">
        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Details
          </h2>
          <div
            class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-400">Card number</p>
                <p class="font-mono text-sm text-gray-800 dark:text-gray-200 tracking-wider">
                  {{ showCardNumber ? entry.cardNumber : maskedCardNumber }}
                </p>
              </div>
              <div class="ml-3 flex shrink-0 gap-2">
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  :title="showCardNumber ? 'Hide number' : 'Show number'"
                  @click="showCardNumber = !showCardNumber"
                >
                  <svg
                    v-if="!showCardNumber"
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
                  <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Copy card number"
                  @click="copy(entry.cardNumber.replace(/\s/g, ''), 'cardNumber')"
                >
                  <svg
                    v-if="copiedField !== 'cardNumber'"
                    class="h-4 w-4"
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
                  <svg
                    v-else
                    class="h-4 w-4 text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-400">Cardholder name</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.cardholderName || '-' }}
                </p>
              </div>
              <button
                v-if="entry.cardholderName"
                type="button"
                class="ml-3 shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title="Copy cardholder name"
                @click="copy(entry.cardholderName, 'cardholderName')"
              >
                <svg
                  v-if="copiedField !== 'cardholderName'"
                  class="h-4 w-4"
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
                <svg
                  v-else
                  class="h-4 w-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700"
            >
              <div class="px-4 py-3">
                <p class="text-xs text-gray-400">Expiration</p>
                <p class="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.expiration || '-' }}
                </p>
              </div>
              <div class="flex items-center justify-between px-4 py-3">
                <div>
                  <p class="text-xs text-gray-400">CVV</p>
                  <p class="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">
                    {{ showCvv ? entry.cvv : '•'.repeat(entry.cvv.length || 3) }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    :title="showCvv ? 'Hide CVV' : 'Show CVV'"
                    @click="showCvv = !showCvv"
                  >
                    <svg
                      v-if="!showCvv"
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    title="Copy CVV"
                    @click="copy(entry.cvv, 'cvv')"
                  >
                    <svg
                      v-if="copiedField !== 'cvv'"
                      class="h-4 w-4"
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
                    <svg
                      v-else
                      class="h-4 w-4 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="entry.notes">
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Notes
          </h2>
          <div
            class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
          >
            <p class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {{ entry.notes }}
            </p>
          </div>
        </section>
      </template>

      <template v-else>
        <section>
          <h2 class="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Content
          </h2>
          <div
            class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
          >
            <p
              class="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300"
            >
              {{ entry.content }}
            </p>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

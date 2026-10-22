<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { VaultEntry } from '@/api/vault'
import { ssoIcon, ssoLabel } from '@/services/sso'
import { useCategoriesStore } from '@/stores/categories'
import { useOrgCategoriesStore } from '@/stores/orgCategories'
import { useVaultStore } from '@/stores/vault'
import { useOrgVaultStore } from '@/stores/orgVault'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import CardNetworkLogo from '@/components/CardNetworkLogo.vue'
import EntryIcon from '@/components/EntryIcon.vue'
import MarkdownText from '@/components/MarkdownText.vue'
import PasswordText from '@/components/PasswordText.vue'
import { displayUrl, externalHref } from '@/services/url'
import { scoreDeep, strengthLabel, strengthColor, strengthDot } from '@/services/passwordStrength'
import { PhArrowSquareOut, PhCaretLeft, PhCheck, PhCopy, PhEye, PhEyeSlash, PhPencilSimple } from '@phosphor-icons/vue'

const { entry } = defineProps<{
  entry: VaultEntry
}>()

const linkHref = computed(() => (entry.type === 'password' ? externalHref(entry.url) : ''))
const linkLabel = computed(() => (entry.type === 'password' ? displayUrl(entry.url) : ''))

const categoriesStore = useCategoriesStore()
const orgCategoriesStore = useOrgCategoriesStore()
const vault = useVaultStore()
const orgVault = useOrgVaultStore()

const categoryName = computed(() =>
  entry.shared
    ? orgCategoriesStore.getCategoryName(entry.categoryId)
    : categoriesStore.getCategoryName(entry.categoryId),
)

const auth = useAuthStore()
const orgStore = useOrganizationStore()

// A shared entry the user may neither change nor remove has nothing for the form to offer, so the
// Edit button is not shown at all. The form still refuses those actions on its own: it is reachable
// by URL and from history (see Organization -> Management -> Access)
const canOpenForm = computed(
  () => !entry.shared || auth.isAdmin || orgStore.memberEditShared || orgStore.memberManageShared,
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

// A password entry may carry no password at all (SSO-only), and may be opted out of analytics -
// both cases have nothing to reveal, copy or score
const hasPassword = computed(() => entry.type === 'password' && entry.password.length > 0)
const isExcluded = computed(() => entry.type === 'password' && entry.excludeFromAnalytics)
const showSecurity = computed(() => hasPassword.value && !isExcluded.value)

const sso = computed(() =>
  entry.type === 'password' && entry.ssoProvider
    ? { label: ssoLabel(entry.ssoProvider, entry.ssoLabel), icon: ssoIcon(entry.ssoProvider) }
    : null,
)

// The entry that holds the actual SSO login. Missing is normal rather than broken: it may have
// been deleted, or belong to another member's private vault when this entry is shared.
const linked = computed(() => {
  if (entry.type !== 'password' || !entry.ssoEntryId) return null
  const found = vault.getEntry(entry.ssoEntryId) ?? orgVault.getEntry(entry.ssoEntryId)
  return found?.type === 'password' ? found : null
})

const linkedRoute = computed(() =>
  linked.value ? `${linked.value.shared ? '/shared' : '/passwords'}/${linked.value.id}` : '',
)

// Entries that sign in through this one - the mirror of `linked`. One pass over both vaults,
// cached until their entries change, and skipped entirely for cards and notes
const linkers = computed(() => {
  if (entry.type !== 'password') return []
  const id = entry.id
  return [...vault.passwords, ...orgVault.passwords].filter(
    (e) => e.id !== id && e.ssoEntryId === id,
  )
})

function entryRoute(e: { id: string; shared: boolean }): string {
  return `${e.shared ? '/shared' : '/passwords'}/${e.id}`
}

const isReused = computed(() =>
  entry.type === 'password' ? vault.isPasswordReused(entry.password) : false,
)

const reusedWith = computed(() =>
  entry.type === 'password' ? vault.getReusedWith(entry.password, entry.id) : [],
)

const isBreachChecking = computed(() => vault.breachCheckingIds.has(entry.id))

function triggerBreachCheck() {
  if (entry.type === 'password' && showSecurity.value) vault.checkEntryBreach(entry)
}

onMounted(triggerBreachCheck)
watch(() => entry.id, triggerBreachCheck)

// The entry carries the instant scoreSync estimate. Refine it here with the dictionary-aware
// scorer, which loads its chunk on demand — the same reason the breach check is deferred to mount
const deepStrength = ref<number | null>(null)

async function refineStrength() {
  deepStrength.value = null
  if (entry.type !== 'password' || !showSecurity.value) return
  const { id, password } = entry
  const score = await scoreDeep(password)
  if (entry.id === id) deepStrength.value = score
}

const strength = computed(() =>
  entry.type === 'password' ? (deepStrength.value ?? entry.passwordStrength) : 0,
)

onMounted(refineStrength)
watch(() => entry.id, refineStrength)

async function copy(text: string, field: string) {
  await navigator.clipboard.writeText(text)
  copiedField.value = field
  setTimeout(() => {
    copiedField.value = null
  }, 2000)
}
</script>

<template>
  <div class="relative isolate flex flex-1 flex-col overflow-y-auto">
    <!-- Ambient wash in the entry's own colour, so each item has a sense of place without any
         extra chrome. Purely decorative, sits behind everything -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-[min(42rem,100%)] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-[0.16] blur-3xl transition-colors duration-500 dark:opacity-[0.2]"
      :class="entry.color || 'bg-gray-400'"
    />
    <button
      type="button"
      class="sm:hidden flex items-center gap-1 px-2 pt-2.5 pb-0.5 text-[15px] font-medium text-gray-600 dark:text-gray-300 w-full transition-colors cursor-pointer"
      @click="emit('back')"
    >
      <PhCaretLeft :size="16" />
      Back
    </button>

    <div
      :key="`${entry.id}-head`"
      class="detail-in mx-auto flex w-full max-w-3xl shrink-0 items-center gap-3.5 px-3 pb-1 pt-3 sm:gap-4 sm:px-6 sm:pb-2 sm:pt-6"
    >
      <span
        v-if="entry.type === 'card'"
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        :class="entry.network ? '' : entry.color"
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
          <h1
            class="truncate text-[22px] font-semibold leading-tight text-gray-900 dark:text-gray-50"
          >
            {{ entry.name }}
          </h1>
          <span
            v-if="entry.shared"
            class="shrink-0 rounded-full bg-gray-900/[0.06] text-gray-700 dark:bg-white/[0.08] dark:text-gray-200 px-2.5 py-0.5 text-xs font-semibold"
          >
            Shared
          </span>
        </div>
        <a
          v-if="entry.type === 'password' && linkHref"
          :href="linkHref"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex max-w-full items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <!-- Truncated like the title above: a long URL would otherwise push the header wide -->
          <span class="truncate">{{ linkLabel }}</span>
          <PhArrowSquareOut :size="12" class="shrink-0" />
        </a>
        <span v-else-if="entry.type === 'password'" class="text-sm text-gray-500">Password</span>
        <span v-else-if="entry.type === 'note'" class="text-sm text-gray-500">Secure Note</span>
        <span v-else-if="entry.type === 'card'" class="text-sm text-gray-500">Credit Card</span>
        <span
          v-if="entry.categoryId"
          class="ml-2 rounded-full bg-gray-900/[0.05] px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/[0.08] dark:text-gray-300"
        >
          {{ categoryName }}
        </span>
      </div>

      <button
        v-if="canOpenForm"
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[13.5px] font-medium text-gray-800 shadow-xs ring-1 ring-gray-900/[0.08] transition-colors hover:bg-gray-50 dark:bg-white/[0.07] dark:text-gray-200 dark:shadow-none dark:ring-white/[0.08] dark:hover:bg-white/[0.1] cursor-pointer"
        @click="emit('edit')"
      >
        <PhPencilSimple :size="16" />
        Edit
      </button>
    </div>

    <div
      :key="`${entry.id}-body`"
      class="detail-in detail-in-late mx-auto w-full max-w-3xl flex-1 space-y-5 px-2 py-3 sm:space-y-6 sm:p-6"
    >
      <template v-if="entry.type === 'password'">
        <section>
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Credentials
          </h2>
          <div
            class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
          >
            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Username</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.username || '-' }}
                </p>
              </div>
              <button
                v-if="entry.username"
                type="button"
                class="-mr-1.5 ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.07] dark:hover:text-gray-200 cursor-pointer"
                title="Copy username"
                @click="copy(entry.username, 'username')"
              >
                <PhCopy :size="16" v-if="copiedField !== 'username'" />
                <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
              </button>
            </div>

            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.email || '-' }}
                </p>
              </div>
              <button
                v-if="entry.email"
                type="button"
                class="-mr-1.5 ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.07] dark:hover:text-gray-200 cursor-pointer"
                title="Copy email"
                @click="copy(entry.email, 'email')"
              >
                <PhCopy :size="16" v-if="copiedField !== 'email'" />
                <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
              </button>
            </div>

            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-500 dark:text-gray-400">Password</p>
                <p
                  v-if="hasPassword"
                  class="break-all font-mono text-[15px] tracking-wide text-gray-900 dark:text-gray-100"
                >
                  <PasswordText v-if="showPassword" :value="entry.password" />
                  <template v-else>{{ '•'.repeat(Math.min(entry.password.length, 18)) }}</template>
                </p>
                <!-- No password stored: say why rather than render an empty row -->
                <p v-else class="text-sm text-gray-400 dark:text-gray-500">
                  <template v-if="linked">Stored in {{ linked.name }}</template>
                  <template v-else>{{ sso ? `Signs in with ${sso.label}` : 'Not set' }}</template>
                </p>
              </div>
              <div v-if="hasPassword" class="ml-3 flex shrink-0 gap-2">
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                >
                  <PhEye :size="16" v-if="!showPassword" />
                  <PhEyeSlash :size="16" v-else />
                </button>
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Copy password"
                  @click="copy(entry.password, 'password')"
                >
                  <PhCopy :size="16" v-if="copiedField !== 'password'" />
                  <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
                </button>
              </div>
            </div>

            <!-- Sign-in method, when this account goes through an identity provider -->
            <div
              v-if="sso"
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Sign-in</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ sso.label }}
                </p>
              </div>
              <EntryIcon
                v-if="sso.icon"
                :name="sso.label"
                color="bg-gray-100 dark:bg-gray-800 text-gray-600! dark:text-gray-300!"
                :icon="sso.icon"
                size="sm"
                class="ml-3"
              />
            </div>

            <!-- The entry that holds this provider's account: jump to it, or copy its password
                 straight from here -->
            <div
              v-if="entry.type === 'password' && entry.ssoEntryId"
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Login entry</p>
                <RouterLink
                  v-if="linked"
                  :to="linkedRoute"
                  class="truncate text-sm font-medium text-gray-800 dark:text-gray-200 underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 hover:decoration-gray-500"
                >
                  {{ linked.name }}
                </RouterLink>
                <p v-else class="truncate text-sm text-gray-400 dark:text-gray-500">
                  Linked entry not available
                </p>
              </div>
              <button
                v-if="linked"
                type="button"
                class="-mr-1.5 ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.07] dark:hover:text-gray-200 cursor-pointer"
                :title="`Copy ${linked.name}'s password`"
                @click="copy(linked.password, 'ssoEntry')"
              >
                <PhCopy :size="16" v-if="copiedField !== 'ssoEntry'" />
                <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
              </button>
            </div>
          </div>
        </section>

        <p
          v-if="isExcluded"
          class="rounded-lg border border-dashed border-gray-200 dark:border-white/[0.08] px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400"
        >
          This entry is excluded from analytics, so it is not included in the Security Center score
          and not checked for weak, reused and breached passwords.
        </p>

        <section v-if="showSecurity">
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Security
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div
              class="rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07] px-3.5 py-3 sm:p-4"
            >
              <p class="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Password strength</p>
              <div class="flex items-center gap-1.5">
                <span class="h-2 w-2 shrink-0 rounded-full" :class="strengthDot(strength)"></span>
                <span class="text-sm font-medium" :class="strengthColor(strength)">
                  {{ strengthLabel(strength) }} · {{ strength }}/10
                </span>
              </div>
            </div>

            <div
              class="relative rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07] px-3.5 py-3 sm:p-4"
              @mouseenter="showReusedTooltip = true"
              @mouseleave="showReusedTooltip = false"
            >
              <p class="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Reused</p>
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
                class="absolute bottom-full left-0 z-50 mb-2 before:absolute before:inset-x-0 before:top-full before:h-2 before:content-[''] w-48 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-800 p-2 shadow-lg"
              >
                <p class="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Also used by
                </p>
                <ul class="space-y-0.5">
                  <li v-for="e in reusedWith" :key="e.id">
                    <RouterLink
                      :to="`${e.shared ? '/shared' : '/passwords'}/${e.id}`"
                      class="flex items-center gap-1.5 rounded px-1 py-0.5 -mx-1 text-xs text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                    >
                      <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
                      <span class="truncate">{{ e.name }}</span>
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </div>

            <div
              class="rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07] px-3.5 py-3 sm:p-4"
            >
              <p class="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Breached</p>
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

        <!-- The mirror of the Login entry row above: who depends on this one to sign in -->
        <section v-if="linkers.length > 0">
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Used for sign-in by
          </h2>
          <div
            class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
          >
            <RouterLink
              v-for="e in linkers"
              :key="e.id"
              :to="entryRoute(e)"
              class="flex items-center gap-3 border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4 last:border-b-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <EntryIcon :name="e.name" :color="e.color" :icon="e.icon" :url="e.url" size="sm" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ e.name }}
                </p>
                <p v-if="e.username || e.email" class="truncate text-xs text-gray-400">
                  {{ e.username || e.email }}
                </p>
              </div>
              <span
                v-if="e.shared"
                class="shrink-0 rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400"
                >Shared</span
              >
            </RouterLink>
          </div>
        </section>

        <section v-if="entry.notes">
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Notes
          </h2>
          <div
            class="rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07] px-3.5 py-3 sm:p-4"
          >
            <MarkdownText :text="entry.notes" />
          </div>
        </section>
      </template>

      <template v-else-if="entry.type === 'card'">
        <section>
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Details
          </h2>
          <div
            class="overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
          >
            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0 flex-1">
                <p class="text-xs text-gray-500 dark:text-gray-400">Card number</p>
                <p
                  class="break-all font-mono text-sm text-gray-800 dark:text-gray-200 tracking-wider"
                >
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
                  <PhEye :size="16" v-if="!showCardNumber" />
                  <PhEyeSlash :size="16" v-else />
                </button>
                <button
                  type="button"
                  class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Copy card number"
                  @click="copy(entry.cardNumber.replace(/\s/g, ''), 'cardNumber')"
                >
                  <PhCopy :size="16" v-if="copiedField !== 'cardNumber'" />
                  <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
                </button>
              </div>
            </div>

            <div
              class="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.08] px-3.5 py-3 sm:px-4"
            >
              <div class="min-w-0">
                <p class="text-xs text-gray-500 dark:text-gray-400">Cardholder name</p>
                <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.cardholderName || '-' }}
                </p>
              </div>
              <button
                v-if="entry.cardholderName"
                type="button"
                class="-mr-1.5 ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.07] dark:hover:text-gray-200 cursor-pointer"
                title="Copy cardholder name"
                @click="copy(entry.cardholderName, 'cardholderName')"
              >
                <PhCopy :size="16" v-if="copiedField !== 'cardholderName'" />
                <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
              </button>
            </div>

            <div
              class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/[0.08]"
            >
              <div class="px-4 py-3">
                <p class="text-xs text-gray-500 dark:text-gray-400">Expiration</p>
                <p class="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">
                  {{ entry.expiration || '-' }}
                </p>
              </div>
              <div class="flex items-center justify-between px-3.5 py-3 sm:px-4">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">CVV</p>
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
                    <PhEye :size="16" v-if="!showCvv" />
                    <PhEyeSlash :size="16" v-else />
                  </button>
                  <button
                    type="button"
                    class="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    title="Copy CVV"
                    @click="copy(entry.cvv, 'cvv')"
                  >
                    <PhCopy :size="16" v-if="copiedField !== 'cvv'" />
                    <PhCheck :size="16" weight="bold" v-else class="text-emerald-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="entry.notes">
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Notes
          </h2>
          <div
            class="rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07] px-3.5 py-3 sm:p-4"
          >
            <MarkdownText :text="entry.notes" />
          </div>
        </section>
      </template>

      <template v-else>
        <section>
          <h2
            class="mb-1.5 px-2 text-[13px] sm:mb-2 sm:px-1 font-medium text-gray-500 dark:text-gray-400"
          >
            Content
          </h2>
          <div
            class="rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07] px-3.5 py-3 sm:p-4"
          >
            <MarkdownText :text="entry.content" />
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

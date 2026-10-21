<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEntries } from '@/composables/useEntries'
import { useSecurityAudit, type SecurityScope } from '@/composables/useSecurityAudit'
import type { VaultPassword } from '@/api/vault'
import EntryIcon from '@/components/EntryIcon.vue'
import PasswordGeneratorCard from '@/components/PasswordGeneratorCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { displayUrl } from '@/services/url'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import { PhCaretDown, PhCaretRight, PhCheckCircle } from '@phosphor-icons/vue'

const router = useRouter()
const vault = useEntries()

const scope = ref<SecurityScope>('personal')
const SCOPES = ['personal', 'organization'] as const
const SCOPE_LABELS = { personal: 'Personal', organization: 'Organization' }
const {
  passwords,
  excludedCount,
  reused,
  weak,
  breached,
  safetyScore,
  checkingBreaches,
  breachProgress,
  breachTotal,
  runBreachScan,
  runDeepScoring,
} = useSecurityAudit(scope)

onMounted(async () => {
  await vault.fetchAll()
  runBreachScan()
  runDeepScoring()
})

// The scan itself always covers every entry (cheap once cached); re-running it after a scope switch just fills in any passwords not yet checked
watch(scope, () => {
  runBreachScan()
  runDeepScoring()
})

const scoreColor = computed(() => {
  if (safetyScore.value >= 80) return 'text-emerald-500'
  if (safetyScore.value >= 50) return 'text-amber-500'
  return 'text-red-500'
})

const scoreLabel = computed(() => {
  if (safetyScore.value >= 80) return 'Well protected'
  if (safetyScore.value >= 50) return 'Needs attention'
  return 'At risk'
})

// SVG donut: r=54 → circumference ≈ 339.3; dash offset maps score to arc
const CIRCUMFERENCE = 2 * Math.PI * 54
// The ring starts empty and draws to the score once the page is up, so the number reads as a
// measurement being taken rather than a static badge
const ringDrawn = ref(false)
onMounted(() => requestAnimationFrame(() => (ringDrawn.value = true)))
const dashOffset = computed(() =>
  ringDrawn.value ? CIRCUMFERENCE * (1 - safetyScore.value / 100) : CIRCUMFERENCE,
)

function openEntry(entry: VaultPassword) {
  router.push(entry.shared ? `/shared/${entry.id}` : `/passwords/${entry.id}`)
}

const sections = computed(() => [
  {
    id: 'breached',
    title: 'Breached passwords',
    entries: breached.value,
    badge: 'bg-red-500/10 text-red-700 dark:text-red-300',
    hint: 'Seen in known data breaches. Change these first.',
    empty: 'No passwords found in known breaches.',
    pending: checkingBreaches.value,
  },
  {
    id: 'reused',
    title: 'Reused passwords',
    entries: reused.value,
    badge: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    hint: 'The same password protects more than one account.',
    empty: 'Every entry uses a unique password.',
    pending: false,
  },
  {
    id: 'weak',
    title: 'Weak passwords',
    entries: weak.value,
    badge: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
    hint: 'Short or predictable enough to be guessed.',
    empty: 'No weak passwords.',
    pending: false,
  },
])

const visibleSections = computed(() =>
  sections.value.filter((s) => s.entries.length > 0 || s.pending),
)

// Each issue list folds away once it has been dealt with or is not the one being worked on
const collapsed = ref(new Set<string>())

function toggleSection(id: string) {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}

// The summary tiles are the way in: each opens its list and brings it into view
function jumpTo(id: string) {
  if (collapsed.value.has(id)) toggleSection(id)
  document.getElementById(`issues-${id}`)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
}

const tiles = computed(() => [
  { id: 'passwords', label: 'Passwords', count: passwords.value.length, tone: '' },
  {
    id: 'breached',
    label: 'Breached',
    count: breached.value.length,
    tone: 'text-red-600 dark:text-red-400',
  },
  {
    id: 'reused',
    label: 'Reused',
    count: reused.value.length,
    tone: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'weak',
    label: 'Weak',
    count: weak.value.length,
    tone: 'text-orange-600 dark:text-orange-400',
  },
])

function openTile(id: string) {
  if (id === 'passwords') router.push('/passwords')
  else jumpTo(id)
}
</script>

<template>
  <div class="h-full overflow-y-auto p-4 sm:p-6">
    <div class="mx-auto max-w-6xl">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Security Center</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Health check for your vault: breached, reused and weak passwords
          </p>
        </div>

        <SegmentedTabs
          v-if="vault.hasOrgAccess"
          class="shrink-0"
          :tabs="SCOPES"
          :labels="SCOPE_LABELS"
          :active="scope"
          @select="scope = $event"
        />
      </div>

      <div
        v-if="vault.loading && passwords.length === 0"
        class="flex flex-col items-center justify-center gap-2 py-20"
      >
        <LoadingSpinner class="text-gray-400" />
        <p class="text-sm text-gray-400">Loading...</p>
      </div>

      <!-- Wide screens: findings on the left, the generator alongside so fixing a password never
           means scrolling away from the list it came from -->
      <div v-else class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div class="min-w-0 space-y-4">
          <!-- Score + summary -->
          <div
            class="flex flex-col items-center gap-6 rounded-xl bg-white p-5 shadow-xs ring-1 ring-gray-900/[0.06] sm:flex-row sm:p-6 dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
          >
            <div class="relative h-36 w-36 shrink-0">
              <svg class="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke-width="10"
                  class="stroke-gray-100 dark:stroke-white/[0.07]"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke-width="10"
                  stroke-linecap="round"
                  stroke="currentColor"
                  class="transition-[stroke-dashoffset,color] duration-1000 ease-[var(--ease-out)] motion-reduce:transition-none"
                  :class="scoreColor"
                  :stroke-dasharray="CIRCUMFERENCE"
                  :stroke-dashoffset="dashOffset"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  class="text-3xl font-semibold tabular-nums tracking-[-0.02em] text-gray-900 dark:text-gray-50"
                  >{{ safetyScore }}<span class="text-lg text-gray-400">%</span></span
                >
                <span class="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400"
                  >Security score</span
                >
              </div>
            </div>

            <div class="w-full flex-1">
              <p class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-50">
                {{ scoreLabel }}
              </p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  v-for="tile in tiles"
                  :key="tile.id"
                  type="button"
                  class="group relative rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 cursor-pointer dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                  :title="
                    tile.id === 'passwords'
                      ? 'Open passwords'
                      : `Show ${tile.label.toLowerCase()} passwords`
                  "
                  @click="openTile(tile.id)"
                >
                  <p
                    class="text-2xl font-semibold tabular-nums"
                    :class="tile.count && tile.tone ? tile.tone : 'text-gray-900 dark:text-gray-50'"
                  >
                    {{ tile.count }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ tile.label }}</p>
                  <PhCaretRight
                    :size="14"
                    class="absolute right-2.5 top-3 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <p
                v-if="checkingBreaches"
                class="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
              >
                <LoadingSpinner class="h-3.5 w-3.5" />
                Checking breaches… {{ breachProgress }}/{{ breachTotal }}
              </p>

              <div
                v-else-if="visibleSections.length === 0"
                class="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <PhCheckCircle :size="16" class="shrink-0" />
                No breached, reused, or weak passwords found
              </div>

              <p v-if="excludedCount > 0" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {{ excludedCount }}
                {{ excludedCount === 1 ? 'entry is' : 'entries are' }} excluded from analytics.
                Entries without a password (SSO-only) are not scored either.
              </p>
            </div>
          </div>

          <!-- Issue sections -->
          <section
            v-for="section in visibleSections"
            :id="`issues-${section.id}`"
            :key="section.id"
            class="scroll-mt-4 overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-900/[0.06] dark:bg-gray-900 dark:shadow-none dark:ring-white/[0.07]"
          >
            <button
              type="button"
              class="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 cursor-pointer dark:hover:bg-white/[0.03]"
              :aria-expanded="!collapsed.has(section.id)"
              :aria-controls="`issues-${section.id}-list`"
              @click="toggleSection(section.id)"
            >
              <div class="min-w-0 flex-1">
                <h2 class="text-[15px] font-semibold text-gray-900 dark:text-gray-50">
                  {{ section.title }}
                </h2>
                <p class="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
                  {{ section.hint }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
                :class="section.badge"
                >{{ section.entries.length }}</span
              >
              <PhCaretDown
                :size="16"
                class="shrink-0 text-gray-400 transition-transform duration-300 ease-[var(--ease-out)]"
                :class="collapsed.has(section.id) ? '-rotate-90' : ''"
                aria-hidden="true"
              />
            </button>

            <!-- Grid-rows trick: animates to the content's real height without measuring it -->
            <div
              :id="`issues-${section.id}-list`"
              class="grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)] motion-reduce:transition-none"
              :class="collapsed.has(section.id) ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'"
            >
              <div class="min-h-0 overflow-hidden">
                <ul
                  v-if="section.entries.length > 0"
                  class="grid gap-0.5 border-t border-gray-100 px-3 py-2 sm:grid-cols-2 dark:border-white/[0.06]"
                >
                  <li v-for="entry in section.entries" :key="entry.id">
                    <button
                      type="button"
                      class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-900/[0.04] cursor-pointer dark:hover:bg-white/[0.05]"
                      @click="openEntry(entry)"
                    >
                      <EntryIcon
                        :name="entry.name"
                        :color="entry.color"
                        :icon="entry.icon"
                        :url="entry.url"
                        size="sm"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {{ entry.name }}
                        </p>
                        <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                          {{ entry.username || entry.email || displayUrl(entry.url) }}
                        </p>
                      </div>
                      <span v-if="entry.shared" class="text-xs text-gray-400">Shared</span>
                      <PhCaretRight
                        :size="16"
                        class="shrink-0 text-gray-300 dark:text-gray-600"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                </ul>
                <p
                  v-else
                  class="border-t border-gray-100 px-5 py-4 text-sm text-gray-500 dark:border-white/[0.06] dark:text-gray-400"
                >
                  {{ section.pending ? 'Checking…' : section.empty }}
                </p>
              </div>
            </div>
          </section>
        </div>

        <!-- Generator -->
        <aside class="xl:sticky xl:top-0">
          <h2 class="text-[15px] font-semibold text-gray-900 dark:text-gray-50">
            Password generator
          </h2>
          <p class="mb-3 mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
            Strong, unique passwords to replace the ones above
          </p>
          <PasswordGeneratorCard />
        </aside>
      </div>
    </div>
  </div>
</template>

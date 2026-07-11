<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEntries } from '@/composables/useEntries'
import { useSecurityAudit, type SecurityScope } from '@/composables/useSecurityAudit'
import type { VaultPassword } from '@/api/vault'
import EntryIcon from '@/components/EntryIcon.vue'
import PasswordGeneratorCard from '@/components/PasswordGeneratorCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const router = useRouter()
const vault = useEntries()

// Scope: audit everything, or split personal vault vs. organization shared vault
// Only shown once the user actually has org access
const scope = ref<SecurityScope>('all')
const {
  passwords,
  reused,
  weak,
  breached,
  safetyScore,
  checkingBreaches,
  breachProgress,
  breachTotal,
  runBreachScan,
} = useSecurityAudit(scope)

onMounted(async () => {
  await vault.fetchAll()
  runBreachScan()
})

// The scan itself always covers every entry (cheap once cached); re-running it after a scope switch just fills in any passwords not yet checked
watch(scope, () => runBreachScan())

const scoreColor = computed(() => {
  if (safetyScore.value >= 80) return 'text-emerald-500'
  if (safetyScore.value >= 50) return 'text-amber-500'
  return 'text-red-500'
})

const scoreLabel = computed(() => {
  if (safetyScore.value >= 80) return 'Good'
  if (safetyScore.value >= 50) return 'Needs attention'
  return 'At risk'
})

// SVG donut: r=54 → circumference ≈ 339.3; dash offset maps score to arc
const CIRCUMFERENCE = 2 * Math.PI * 54
const dashOffset = computed(() => CIRCUMFERENCE * (1 - safetyScore.value / 100))

function openEntry(entry: VaultPassword) {
  router.push(entry.shared ? `/shared/${entry.id}` : `/passwords/${entry.id}`)
}

const sections = computed(() => [
  {
    id: 'breached',
    title: 'Breached passwords',
    entries: breached.value,
    accent: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    empty: 'No passwords found in known breaches.',
    pending: checkingBreaches.value,
  },
  {
    id: 'reused',
    title: 'Reused passwords',
    entries: reused.value,
    accent: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    empty: 'Every entry uses a unique password.',
    pending: false,
  },
  {
    id: 'weak',
    title: 'Weak passwords',
    entries: weak.value,
    accent: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
    empty: 'No weak passwords.',
    pending: false,
  },
])

// Only surface a card when it has issues (or is still being checked)
// A section with zero entries and nothing pending is a clean result — hide it entirely
const visibleSections = computed(() =>
  sections.value.filter((s) => s.entries.length > 0 || s.pending),
)
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="max-w-4xl">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Security Center</h1>
          <p class="mt-1 mb-6 text-sm text-gray-400">
            Health check for your vault: breached, reused and weak passwords
          </p>
        </div>

        <div
          v-if="vault.hasOrgAccess"
          class="flex w-fit gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 shrink-0"
        >
          <button
            v-for="option in ['all', 'personal', 'organization'] as const"
            :key="option"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            :class="
              scope === option
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            "
            @click="scope = option"
          >
            {{ option === 'all' ? 'All' : option === 'personal' ? 'Personal' : 'Organization' }}
          </button>
        </div>
      </div>

      <div
        v-if="vault.loading && passwords.length === 0"
        class="flex flex-col items-center justify-center gap-2 py-20"
      >
        <LoadingSpinner class="text-gray-400" />
        <p class="text-sm text-gray-400">Loading...</p>
      </div>

      <template v-else>
        <!-- Score + summary -->
        <div
          class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6"
        >
          <div class="relative h-36 w-36 shrink-0">
            <svg class="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke-width="10"
                class="stroke-gray-100 dark:stroke-gray-800"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke-width="10"
                stroke-linecap="round"
                stroke="currentColor"
                class="transition-all duration-700"
                :class="scoreColor"
                :stroke-dasharray="CIRCUMFERENCE"
                :stroke-dashoffset="dashOffset"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-bold text-gray-900 dark:text-gray-100"
                >{{ safetyScore }}%</span
              >
              <span class="text-xs font-medium" :class="scoreColor">{{ scoreLabel }}</span>
            </div>
          </div>

          <div class="flex-1 w-full">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {{ passwords.length }}
                </p>
                <p class="text-xs text-gray-500">Passwords</p>
              </div>
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p class="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {{ breached.length }}
                </p>
                <p class="text-xs text-gray-500">Breached</p>
              </div>
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p class="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  {{ reused.length }}
                </p>
                <p class="text-xs text-gray-500">Reused</p>
              </div>
              <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <p class="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                  {{ weak.length }}
                </p>
                <p class="text-xs text-gray-500">Weak</p>
              </div>
            </div>
            <p v-if="checkingBreaches" class="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <LoadingSpinner class="h-3.5 w-3.5" />
              Checking breaches… {{ breachProgress }}/{{ breachTotal }}
            </p>

            <!-- All clear: nothing has issues and nothing is still checking. -->
            <div
              v-else-if="visibleSections.length === 0"
              class="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
            >
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              No breached, reused, or weak passwords found.
            </div>
          </div>
        </div>

        <!-- Issue sections -->
        <div
          v-for="section in visibleSections"
          :key="section.id"
          class="mt-5 rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold" :class="section.accent">
                {{ section.title }}
              </h2>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="section.badge"
              >{{ section.entries.length }}</span
            >
          </div>

          <ul
            v-if="section.entries.length > 0"
            class="mt-3 divide-y divide-gray-100 dark:divide-gray-800"
          >
            <li v-for="entry in section.entries" :key="entry.id">
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
                  <p class="truncate text-xs text-gray-500">
                    {{ entry.username || entry.email || entry.url }}
                  </p>
                </div>
                <span v-if="entry.shared" class="text-xs text-gray-400">Shared</span>
                <svg
                  class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </li>
          </ul>
          <p v-else-if="section.pending" class="mt-3 text-sm text-gray-400">Checking…</p>
          <p v-else class="mt-3 text-sm text-gray-400">{{ section.empty }}</p>
        </div>

        <!-- Generator -->
        <div class="mt-8">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Password Generator</h2>
          <p class="mt-1 mb-6 text-sm text-gray-400">Generate strong, unique passwords.</p>
          <PasswordGeneratorCard />
        </div>
      </template>
    </div>
  </div>
</template>

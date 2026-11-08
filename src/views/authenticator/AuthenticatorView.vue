<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  PhClockCountdown,
  PhDownloadSimple,
  PhMagnifyingGlass,
  PhPlus,
  PhUploadSimple,
} from '@phosphor-icons/vue'
import { hasTotp } from '@/api/vault'
import { useEntries } from '@/composables/useEntries'
import EntryIcon from '@/components/EntryIcon.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import TotpCode from '@/components/TotpCode.vue'
import TotpExportModal from '@/components/TotpExportModal.vue'
import TotpImportModal from '@/components/TotpImportModal.vue'

const vault = useEntries()
const query = ref('')
const importing = ref(false)
const exporting = ref(false)

onMounted(() => {
  void vault.fetchAll()
})

const withCodes = computed(() =>
  vault.passwords
    .filter(hasTotp)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
)

// The shared vault's codes stay out of an export: its own export is an admin action
const exportable = computed(() =>
  withCodes.value
    .filter((e) => !e.shared)
    .map(({ name, username, email, totp }) => ({ name, username, email, totp })),
)

// Search only earns its space once the list is long enough to need it
const showSearch = computed(() => withCodes.value.length > 6)

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return withCodes.value
  return withCodes.value.filter((e) =>
    [e.name, e.username, e.email, e.url].some((field) => field.toLowerCase().includes(q)),
  )
})

const loading = computed(() => vault.loading && vault.passwords.length === 0)

function entryLink(id: string, shared: boolean) {
  return shared ? `/shared/${id}` : `/passwords/${id}`
}

const actionButton =
  'inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900/5 px-2.5 text-sm font-medium text-gray-800 hover:bg-gray-900/9 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 dark:bg-white/8 dark:text-gray-100 dark:hover:bg-white/12'

// A row copies its code wherever it is clicked, so each row needs a handle on its code button
const codes = new Map<string, InstanceType<typeof TotpCode>>()
function setCode(id: string, el: unknown) {
  if (el) codes.set(id, el as InstanceType<typeof TotpCode>)
  else codes.delete(id)
}
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="detail-in w-full max-w-3xl px-3 pb-10 pt-4 sm:px-6 sm:pt-6">
      <header class="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-0.5">
        <div class="min-w-0">
          <h1 class="text-[22px] font-semibold leading-tight text-gray-900 dark:text-gray-50">
            Authenticator
          </h1>
          <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
            {{ withCodes.length }} {{ withCodes.length === 1 ? 'code' : 'codes' }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <label v-if="showSearch" class="relative block w-40 shrink-0 sm:w-56">
            <span class="sr-only">Search codes</span>
            <PhMagnifyingGlass
              :size="15"
              class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              v-model="query"
              type="search"
              placeholder="Search"
              autocomplete="off"
              class="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-[15px] text-gray-900 transition focus:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-900/6 sm:text-sm dark:border-white/10 dark:bg-white/4 dark:text-gray-100 dark:focus:border-white/25 dark:focus:ring-white/6"
            />
          </label>

          <button
            type="button"
            :class="actionButton"
            title="Import 2FA codes"
            @click="importing = true"
          >
            <PhDownloadSimple :size="16" />
            <span class="hidden sm:inline">Import</span>
            <span class="sr-only sm:hidden">Import</span>
          </button>
          <button
            type="button"
            :class="actionButton"
            title="Export 2FA codes"
            :disabled="exportable.length === 0"
            @click="exporting = true"
          >
            <PhUploadSimple :size="16" />
            <span class="hidden sm:inline">Export</span>
            <span class="sr-only sm:hidden">Export</span>
          </button>
        </div>
      </header>

      <div v-if="loading" class="flex flex-col items-center justify-center gap-2 py-24">
        <LoadingSpinner class="text-gray-400" />
        <p class="text-sm text-gray-400">Loading...</p>
      </div>

      <div
        v-else-if="withCodes.length === 0"
        class="flex flex-col items-start gap-1 px-0.5 py-12 text-left"
      >
        <PhClockCountdown :size="36" class="mb-3 text-gray-300 dark:text-gray-600" />
        <p class="text-[15px] font-medium text-gray-700 dark:text-gray-300">No 2FA codes yet</p>
        <p class="max-w-xs text-[13px] text-gray-500 dark:text-gray-400">
          Add a setup key or QR code to a password and its live code shows up here.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <RouterLink
            to="/vault/new?type=password"
            class="flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 pl-2.5 pr-3.5 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
          >
            <PhPlus :size="16" weight="bold" />
            <span class="text-sm font-semibold">Add password</span>
          </RouterLink>
          <button type="button" :class="actionButton" @click="importing = true">
            <PhDownloadSimple :size="16" />
            Import codes
          </button>
        </div>
      </div>

      <p v-else-if="shown.length === 0" class="px-0.5 py-12 text-sm text-gray-400">
        No codes match "{{ query }}".
      </p>

      <ul
        v-else
        class="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-gray-900/6 dark:divide-white/8 dark:bg-gray-900 dark:shadow-none dark:ring-white/7"
      >
        <li
          v-for="entry in shown"
          :key="entry.id"
          class="flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-gray-50 sm:px-4 dark:hover:bg-white/3"
          @click="codes.get(entry.id)?.copy()"
        >
          <EntryIcon
            :name="entry.name"
            :color="entry.color"
            :icon="entry.icon"
            :url="entry.url"
            size="sm"
            class="shrink-0"
          />

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <RouterLink
                :to="entryLink(entry.id, entry.shared)"
                class="truncate text-sm font-medium text-gray-900 hover:underline dark:text-gray-100"
                title="Open entry"
                @click.stop
              >
                {{ entry.name }}
              </RouterLink>
              <span
                v-if="entry.shared"
                class="shrink-0 rounded-full bg-gray-900/6 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-white/8 dark:text-gray-200"
              >
                Shared
              </span>
            </div>
            <p class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ entry.username || entry.email || 'No username' }}
            </p>
          </div>

          <TotpCode :ref="(el) => setCode(entry.id, el)" :uri="entry.totp" @click.stop />
        </li>
      </ul>

      <p
        v-if="withCodes.length > 0 && !loading"
        class="mt-3 px-1 text-xs text-gray-400 dark:text-gray-500"
      >
        Click a code to copy it.
      </p>
    </div>

    <TotpImportModal v-if="importing" @close="importing = false" />
    <TotpExportModal v-if="exporting" :entries="exportable" @close="exporting = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEntries } from '@/composables/useEntries'
import VaultEntrySidebar from '@/components/VaultEntrySidebar.vue'
import VaultEntryDetail from '@/components/VaultEntryDetail.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { PhPlus } from '@phosphor-icons/vue'
import IconPadlock from '@/components/icons/IconPadlock.vue'

const route = useRoute()
const router = useRouter()
// "All Items" spans both the personal vault and the organization shared vault, so search/select here can surface shared entries too
const vault = useEntries()

onMounted(() => {
  vault.fetchAll()
})

const selectedId = computed(() => (route.params.id as string) ?? null)
const selectedEntry = computed(() => (selectedId.value ? vault.getEntry(selectedId.value) : null))

function onSelect(id: string) {
  router.push({ name: 'vault-entry', params: { id } })
}

function onEdit() {
  if (selectedId.value) {
    router.push({ name: 'vault-edit', params: { id: selectedId.value } })
  }
}

function onBack() {
  router.push({ name: 'vault' })
}
</script>

<template>
  <div class="flex h-full">
    <VaultEntrySidebar
      sort-key="vault"
      :entries="vault.entries"
      :selected-id="selectedId"
      title="All Items"
      show-type-filter
      @select="onSelect"
    />

    <div
      v-if="vault.loading && vault.entries.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-2"
    >
      <LoadingSpinner class="text-gray-400" />
      <p class="text-sm text-gray-400">Loading vault...</p>
    </div>

    <VaultEntryDetail
      v-else-if="selectedEntry"
      :entry="selectedEntry"
      @edit="onEdit"
      @back="onBack"
    />

    <div
      v-else
      class="hidden flex-1 flex-col items-center justify-center gap-1 px-6 text-center sm:flex"
    >
      <IconPadlock size="lg" class="mb-4" />
      <p class="text-[15px] font-medium text-gray-700 dark:text-gray-300">
        Select an item to view details
      </p>
      <p class="text-[13px] tabular-nums text-gray-500 dark:text-gray-400">
        {{ vault.entries.length }} items in vault
      </p>

      <RouterLink
        to="/vault/new"
        class="mt-5 flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 pl-2.5 pr-3.5 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
      >
        <PhPlus :size="16" weight="bold" />
        <span class="text-[13.5px] font-medium">Add entry</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import VaultEntrySidebar from '@/components/VaultEntrySidebar.vue'
import VaultEntryDetail from '@/components/VaultEntryDetail.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const vault = useVaultStore()

onMounted(() => {
  if (vault.entries.length === 0) vault.fetchEntries()
})

const selectedId = computed(() => (route.params.id as string) ?? null)
const selectedEntry = computed(() => (selectedId.value ? vault.getEntry(selectedId.value) : null))

function onSelect(id: string) {
  router.push({ name: 'cards-entry', params: { id } })
}

function onEdit() {
  if (selectedId.value) {
    router.push({ name: 'vault-edit', params: { id: selectedId.value } })
  }
}

function onBack() {
  router.push({ name: 'cards' })
}
</script>

<template>
  <div class="flex h-full">
    <VaultEntrySidebar
      :entries="vault.cards"
      :selected-id="selectedId"
      title="Cards"
      @select="onSelect"
    />

    <div
      v-if="vault.loading && vault.entries.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-2"
    >
      <LoadingSpinner class="text-gray-400" />
      <p class="text-sm text-gray-400">Loading...</p>
    </div>

    <VaultEntryDetail
      v-else-if="selectedEntry"
      :entry="selectedEntry"
      @edit="onEdit"
      @back="onBack"
    />

    <div v-else class="flex flex-1 flex-col items-center justify-center gap-1">
      <p class="text-sm font-medium text-gray-500">Select a card to view details</p>
      <p class="text-xs text-gray-400">
        {{ vault.cards.length }} card{{ vault.cards.length !== 1 ? 's' : '' }} saved
      </p>

      <RouterLink
        to="/vault/new?type=card"
        class="mt-4 flex items-center gap-2 rounded-md bg-gray-800 px-3 py-1.5 text-white hover:bg-gray-700"
        title="Add entry (N)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="text-sm font-semibold">Add card</span>
      </RouterLink>
    </div>
  </div>
</template>

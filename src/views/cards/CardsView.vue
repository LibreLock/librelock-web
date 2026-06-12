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

    <div v-if="vault.loading && vault.entries.length === 0" class="flex flex-1 flex-col items-center justify-center gap-2">
      <LoadingSpinner class="text-slate-400" />
      <p class="text-sm text-slate-400">Loading...</p>
    </div>

    <VaultEntryDetail v-else-if="selectedEntry" :entry="selectedEntry" @edit="onEdit" @back="onBack" />

    <div v-else class="flex flex-1 flex-col items-center justify-center gap-1">
      <p class="text-sm font-medium text-slate-500">Select a card to view details</p>
      <p class="text-xs text-slate-400">{{ vault.cards.length }} card{{ vault.cards.length !== 1 ? 's' : '' }} saved</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import VaultEntrySidebar from '@/components/VaultEntrySidebar.vue'
import VaultEntryDetail from '@/components/VaultEntryDetail.vue'

const route = useRoute()
const router = useRouter()
const vault = useVaultStore()

onMounted(() => {
  if (vault.entries.length === 0) vault.fetchEntries()
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
</script>

<template>
  <div class="flex h-full">
    <VaultEntrySidebar
      :entries="vault.entries"
      :selected-id="selectedId"
      title="All Items"
      @select="onSelect"
    />

    <div v-if="vault.loading && vault.entries.length === 0" class="flex flex-1 items-center justify-center">
      <p class="text-sm text-slate-400">Loading vault...</p>
    </div>

    <VaultEntryDetail v-else-if="selectedEntry" :entry="selectedEntry" @edit="onEdit" />

    <div v-else class="flex flex-1 flex-col items-center justify-center gap-1">
      <p class="text-sm font-medium text-slate-500">Select an item to view details</p>
      <p class="text-xs text-slate-400">{{ vault.entries.length }} items in vault</p>
    </div>
  </div>
</template>

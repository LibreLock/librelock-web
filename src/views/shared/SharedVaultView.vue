<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrgVaultStore } from '@/stores/orgVault'
import VaultEntrySidebar from '@/components/VaultEntrySidebar.vue'
import VaultEntryDetail from '@/components/VaultEntryDetail.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const org = useOrgVaultStore()

onMounted(() => {
  if (org.entries.length === 0) org.fetchEntries()
})

const selectedId = computed(() => (route.params.id as string) ?? null)
const selectedEntry = computed(() => (selectedId.value ? org.getEntry(selectedId.value) : null))

function onSelect(id: string) {
  router.push({ name: 'shared-entry', params: { id } })
}

function onEdit() {
  if (selectedId.value) {
    router.push({ name: 'vault-edit', params: { id: selectedId.value } })
  }
}

function onBack() {
  router.push({ name: 'shared' })
}
</script>

<template>
  <div class="flex h-full">
    <VaultEntrySidebar
      :entries="org.entries"
      :selected-id="selectedId"
      title="Shared"
      shared
      @select="onSelect"
    />

    <div
      v-if="org.loading && org.entries.length === 0"
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
      <p class="text-sm font-medium text-gray-500">Select a shared item to view details</p>
      <p class="text-xs text-gray-400">{{ org.entries.length }} shared items</p>
    </div>
  </div>
</template>

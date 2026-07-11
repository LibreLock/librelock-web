<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { useThemeStore } from '@/stores/theme'
import { useVaultStore } from '@/stores/vault'

useThemeStore()

// Routes with their own searchable entry list (via VaultEntrySidebar) filter in place; entry forms are left alone so typing a search doesn't blow away an in-progress edit
// Everywhere else (security, settings, organization, ...) has no results to show, so send the user to the vault view where they can actually see matches
const SEARCHABLE_NAMES = new Set([
  'vault',
  'vault-entry',
  'passwords',
  'passwords-entry',
  'cards',
  'cards-entry',
  'notes',
  'notes-entry',
  'shared',
  'shared-entry',
])
const FORM_NAMES = new Set(['vault-new', 'vault-edit'])

const route = useRoute()
const router = useRouter()
const vault = useVaultStore()

watch(
  () => vault.globalSearch,
  (q) => {
    if (!q.trim()) return
    const name = route.name
    if (typeof name === 'string' && (SEARCHABLE_NAMES.has(name) || FORM_NAMES.has(name))) return
    router.push('/vault')
  },
)
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-950">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <main class="flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>
  </div>
</template>

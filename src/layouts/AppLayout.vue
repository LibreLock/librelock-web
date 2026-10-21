<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBottomNav from '@/components/AppBottomNav.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { useAppViewport } from '@/composables/useAppViewport'
import { useThemeStore } from '@/stores/theme'
import { useVaultStore } from '@/stores/vault'

useThemeStore()
useAppViewport()

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
  <!-- Pinned to the visual viewport (see useAppViewport) so the topbar and bottom nav stay put
       in an installed PWA, keyboard open or not; h-dvh is the pre-hydration fallback -->
  <div
    class="fixed inset-x-0 flex h-dvh overflow-hidden bg-gray-50 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:bg-gray-100 dark:bg-gray-950 md:dark:bg-[#0b0b0c]"
    :style="{ top: 'var(--app-offset-top, 0px)', height: 'var(--app-height, 100dvh)' }"
  >
    <AppSidebar />
    <!-- On desktop the working area is one raised sheet beside the sidebar, the way a macOS window
         separates its source list from the content it drives -->
    <div class="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
      <div
        class="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 md:rounded-[14px] md:shadow-[0_1px_3px_rgb(17_17_19/0.06),0_0_0_0.5px_rgb(17_17_19/0.08)] dark:bg-gray-950 md:dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.08)]"
      >
        <AppTopbar />
        <main class="flex-1 overflow-hidden">
          <!-- The entry form serves both vault-new and vault-edit, so router-view would otherwise
             reuse the instance across a form-to-form move and keep the old entry loaded. Keying
             those routes by path forces a remount; every other route stays unkeyed so selecting an
             entry in a list view does not throw the list away -->
          <RouterView v-slot="{ Component, route: current }">
            <component
              :is="Component"
              :key="FORM_NAMES.has(String(current.name)) ? current.fullPath : undefined"
            />
          </RouterView>
        </main>
      </div>
      <AppBottomNav />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsAccountTab from './SettingsAccountTab.vue'
import SettingsSessionsTab from './SettingsSessionsTab.vue'
import SettingsExportTab from './SettingsExportTab.vue'
import SettingsAboutTab from './SettingsAboutTab.vue'

const TABS = ['account', 'sessions', 'export', 'about'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  account: 'Account',
  sessions: 'Sessions',
  export: 'Export & Import',
  about: 'About',
}

const route = useRoute()
const router = useRouter()

const activeTab = computed<Tab>(() => {
  const hash = route.hash.slice(1)
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'account'
})

function onTabChange(tab: Tab) {
  router.replace({ hash: `#${tab}` })
}
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="max-w-3xl">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
      <p class="mt-1 mb-6 text-sm text-gray-400">Manage your account and security preferences</p>

      <div
        class="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-gray-700 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          v-for="tab in TABS"
          :key="tab"
          type="button"
          class="shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === tab
              ? 'border-gray-800 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          "
          @click="onTabChange(tab)"
        >
          {{ TAB_LABELS[tab] }}
        </button>
      </div>

      <SettingsAccountTab v-if="activeTab === 'account'" />
      <SettingsSessionsTab v-if="activeTab === 'sessions'" />
      <SettingsExportTab v-if="activeTab === 'export'" />
      <SettingsAboutTab v-if="activeTab === 'about'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsAccountTab from './SettingsAccountTab.vue'
import SettingsSessionsTab from './SettingsSessionsTab.vue'

const TABS = ['account', 'sessions'] as const
type Tab = (typeof TABS)[number]

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
  <div class="overflow-y-auto h-full p-6">
    <div class="max-w-3xl">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
      <p class="mt-1 mb-6 text-sm text-gray-400">Manage your account and security preferences</p>

      <div class="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          class="sm:px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'account'
              ? 'border-gray-800 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          "
          @click="onTabChange('account')"
        >
          Account
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'sessions'
              ? 'border-gray-800 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          "
          @click="onTabChange('sessions')"
        >
          Sessions
        </button>
      </div>

      <SettingsAccountTab v-if="activeTab === 'account'" />
      <SettingsSessionsTab v-if="activeTab === 'sessions'" />
    </div>
  </div>
</template>

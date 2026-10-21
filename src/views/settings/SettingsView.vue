<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsAccountTab from './SettingsAccountTab.vue'
import SettingsSecurityTab from './SettingsSecurityTab.vue'
import SettingsInstanceTab from './SettingsInstanceTab.vue'
import SettingsSessionsTab from './SettingsSessionsTab.vue'
import SettingsExportTab from './SettingsExportTab.vue'
import SettingsAboutTab from './SettingsAboutTab.vue'
import { useOrganizationStore } from '@/stores/organization'
import SegmentedTabs from '@/components/SegmentedTabs.vue'

const ALL_TABS = ['account', 'security', 'instance', 'sessions', 'export', 'about'] as const
type Tab = (typeof ALL_TABS)[number]

const TAB_LABELS: Record<Tab, string> = {
  account: 'Account',
  security: 'Security',
  instance: 'Instance',
  sessions: 'Sessions',
  export: 'Export & Import',
  about: 'About',
}

const route = useRoute()
const router = useRouter()
const org = useOrganizationStore()

// Instance-wide settings are personal-mode only; organization instances manage the equivalents from the Organization area
const tabs = computed(() => ALL_TABS.filter((tab) => tab !== 'instance' || !org.isOrganization))

const activeTab = computed<Tab>(() => {
  const hash = route.hash.slice(1)
  return (tabs.value as readonly string[]).includes(hash) ? (hash as Tab) : 'account'
})

function onTabChange(tab: Tab) {
  router.replace({ hash: `#${tab}` })
}
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="mx-auto max-w-6xl">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
      <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Manage your account and security preferences
      </p>

      <SegmentedTabs
        class="mb-6"
        :tabs="tabs"
        :labels="TAB_LABELS"
        :active="activeTab"
        @select="onTabChange"
      />

      <div :key="activeTab" class="detail-in">
        <SettingsAccountTab v-if="activeTab === 'account'" />
        <SettingsSecurityTab v-if="activeTab === 'security'" />
        <SettingsInstanceTab v-if="activeTab === 'instance'" />
        <SettingsSessionsTab v-if="activeTab === 'sessions'" />
        <SettingsExportTab v-if="activeTab === 'export'" />
        <SettingsAboutTab v-if="activeTab === 'about'" />
      </div>
    </div>
  </div>
</template>

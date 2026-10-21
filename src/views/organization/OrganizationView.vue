<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import SegmentedTabs from '@/components/SegmentedTabs.vue'
import OrgCustomizationTab from './OrgCustomizationTab.vue'
import OrgUsersTab from './OrgUsersTab.vue'
import OrgInvitesTab from './OrgInvitesTab.vue'
import OrgManagementTab from './OrgManagementTab.vue'
import OrgAuditTab from './OrgAuditTab.vue'
import OrgExportTab from './OrgExportTab.vue'

type Tab = 'users' | 'invites' | 'customization' | 'export' | 'management' | 'audit'

const org = useOrganizationStore()
const route = useRoute()
const router = useRouter()

// Invites tab only exists in invite-only registration mode
const tabs = computed<Tab[]>(() =>
  org.registration === 'invite'
    ? ['users', 'invites', 'customization', 'export', 'audit', 'management']
    : ['users', 'customization', 'export', 'audit', 'management'],
)

const activeTab = computed<Tab>(() => {
  const hash = route.hash.slice(1)
  return tabs.value.includes(hash as Tab) ? (hash as Tab) : 'users'
})

function onTabChange(tab: Tab) {
  router.replace({ hash: `#${tab}` })
}

const tabLabels: Record<Tab, string> = {
  users: 'Users',
  invites: 'Invites',
  customization: 'Customization',
  export: 'Export & Import',
  management: 'Management',
  audit: 'Audit log',
}
</script>

<template>
  <div class="overflow-y-auto h-full p-4 sm:p-6">
    <div class="mx-auto max-w-6xl">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Organization</h1>
      <p class="mt-1 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Manage users and company branding
      </p>

      <SegmentedTabs
        class="mb-6"
        :tabs="tabs"
        :labels="tabLabels"
        :active="activeTab"
        @select="onTabChange"
      />

      <div :key="activeTab" class="detail-in">
        <OrgUsersTab v-if="activeTab === 'users'" />
        <OrgInvitesTab v-if="activeTab === 'invites'" />
        <OrgCustomizationTab v-if="activeTab === 'customization'" />
        <OrgExportTab v-if="activeTab === 'export'" />
        <OrgManagementTab v-if="activeTab === 'management'" />
        <OrgAuditTab v-if="activeTab === 'audit'" />
      </div>
    </div>
  </div>
</template>

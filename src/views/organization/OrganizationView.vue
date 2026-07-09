<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrganizationStore } from '@/stores/organization'
import OrgCustomizationTab from './OrgCustomizationTab.vue'
import OrgUsersTab from './OrgUsersTab.vue'
import OrgInvitesTab from './OrgInvitesTab.vue'
import OrgManagementTab from './OrgManagementTab.vue'
import OrgAuditTab from './OrgAuditTab.vue'

type Tab = 'users' | 'invites' | 'customization' | 'management' | 'audit'

const org = useOrganizationStore()
const route = useRoute()
const router = useRouter()

// Invites tab only exists in invite-only registration mode.
const tabs = computed<Tab[]>(() =>
  org.registration === 'invite'
    ? ['users', 'invites', 'customization', 'audit', 'management']
    : ['users', 'customization', 'audit', 'management'],
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
  management: 'Management',
  audit: 'Audit log',
}
</script>

<template>
  <div class="overflow-y-auto h-full p-6">
    <div class="max-w-3xl">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Organization</h1>
      <p class="mt-1 mb-6 text-sm text-gray-400">Manage users and company branding</p>

      <div class="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === tab
              ? 'border-gray-800 dark:border-gray-100 text-gray-900 dark:text-gray-100'
              : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          "
          @click="onTabChange(tab)"
        >
          {{ tabLabels[tab] }}
        </button>
      </div>

      <OrgUsersTab v-if="activeTab === 'users'" />
      <OrgInvitesTab v-if="activeTab === 'invites'" />
      <OrgCustomizationTab v-if="activeTab === 'customization'" />
      <OrgManagementTab v-if="activeTab === 'management'" />
      <OrgAuditTab v-if="activeTab === 'audit'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SettingsAccountTab from './SettingsAccountTab.vue'
import SettingsSecurityTab from './SettingsSecurityTab.vue'
import SettingsSessionsTab from './SettingsSessionsTab.vue'

type Tab = 'account' | 'security' | 'sessions'
const activeTab = ref<Tab>('account')

function onTabChange(tab: Tab) {
  activeTab.value = tab
}
</script>

<template>
  <div class="overflow-y-auto h-full p-6">
    <div class="max-w-3xl">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
      <p class="mt-1 mb-6 text-sm text-slate-400">Manage your account and security preferences</p>

      <div class="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          type="button"
          class="sm:px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'account'
              ? 'border-slate-800 dark:border-slate-100 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          "
          @click="onTabChange('account')"
        >
          Account
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'security'
              ? 'border-slate-800 dark:border-slate-100 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          "
          @click="onTabChange('security')"
        >
          Security
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px"
          :class="
            activeTab === 'sessions'
              ? 'border-slate-800 dark:border-slate-100 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          "
          @click="onTabChange('sessions')"
        >
          Sessions
        </button>
      </div>

      <SettingsAccountTab v-if="activeTab === 'account'" />
      <SettingsSecurityTab v-if="activeTab === 'security'" />
      <SettingsSessionsTab v-if="activeTab === 'sessions'" />
    </div>
  </div>
</template>

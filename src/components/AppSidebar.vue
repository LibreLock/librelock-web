<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'sidebar-collapsed'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(false)

onMounted(() => {
  collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
}

async function handleLogout() {
  await auth.signOut()
  router.push('/login')
}

const navItems = [
  { name: 'Vault', to: '/vault', icon: 'vault' },
  { name: 'Security Center', to: '/security', icon: 'shield' },
]
</script>

<template>
  <aside
    class="flex h-screen flex-shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div
      class="flex flex-shrink-0 border-b border-slate-100 p-2"
      :class="
        collapsed ? 'h-auto flex-col items-center gap-2' : 'h-14 items-center gap-3 pl-4 pr-2'
      "
    >
      <RouterLink to="/" class="flex items-center gap-3" :class="collapsed ? 'justify-center' : ''">
        <div
          class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-600 text-white"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <span v-if="!collapsed" class="truncate text-sm font-semibold text-slate-900"> PMNG </span>
      </RouterLink>
      <button
        type="button"
        :class="[
          'flex items-center justify-center rounded-lg px-2 py-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer',
          !collapsed && 'ml-auto',
        ]"
        @click="toggleCollapse"
      >
        <svg
          class="h-5 w-5 transition-transform duration-200"
          :class="collapsed ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>
    </div>

    <nav class="flex-1 space-y-1 p-2 pt-3">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="
          route.path === item.to
            ? 'bg-gray-200 text-gray-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        "
        :title="collapsed ? item.name : undefined"
      >
        <template v-if="item.icon === 'vault'">
          <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </template>
        <template v-else-if="item.icon === 'shield'">
          <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </template>
        <span v-if="!collapsed">{{ item.name }}</span>
      </RouterLink>
    </nav>

    <div class="flex-shrink-0 space-y-1 border-t border-slate-100 p-2">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 cursor-pointer"
        :disabled="auth.isSubmitting"
        :title="collapsed ? 'Log out' : undefined"
        @click="handleLogout"
      >
        <svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span v-if="!collapsed">{{ auth.isSubmitting ? 'Logging out...' : 'Log out' }}</span>
      </button>
    </div>
  </aside>
</template>

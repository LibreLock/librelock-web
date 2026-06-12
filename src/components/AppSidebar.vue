<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import IconPadlock from './icons/IconPadlock.vue'
import LoadingSpinner from './LoadingSpinner.vue'

const STORAGE_KEY = 'sidebar-collapsed'
const SMALL_SCREEN_BREAKPOINT = 768

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(false)

function syncCollapseToScreenSize() {
  if (window.innerWidth < SMALL_SCREEN_BREAKPOINT) {
    collapsed.value = true
  } else {
    collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'
  }
}

onMounted(() => {
  collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'
  syncCollapseToScreenSize()
  window.addEventListener('resize', syncCollapseToScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', syncCollapseToScreenSize)
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
}

async function handleLogout() {
  try {
    await auth.logOut()
    router.push('/login')
  } catch {
    window.location.href = '/login'
  }
}

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

const navItems = [
  { name: 'All Items', to: '/vault', icon: 'vault' },
  { name: 'Passwords', to: '/passwords', icon: 'password' },
  { name: 'Cards', to: '/cards', icon: 'card' },
  { name: 'Secure Notes', to: '/notes', icon: 'note' },
  { name: 'Password Generator', to: '/generator', icon: 'generator' },
]
</script>

<template>
  <aside
    class="flex h-screen shrink-0 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <div
      class="flex shrink-0 border-b border-slate-100 dark:border-slate-700/60 p-3"
      :class="
        collapsed ? 'h-auto flex-col items-center gap-2' : 'h-14 items-center gap-3 pl-4 pr-2'
      "
    >
      <RouterLink to="/" class="flex items-center gap-3" :class="collapsed ? 'justify-center' : ''">
        <IconPadlock size="md" />
        <span
          v-if="!collapsed"
          class="truncate text-lg font-semibold text-slate-900 dark:text-slate-100"
          >LibreLock</span
        >
      </RouterLink>
      <button
        type="button"
        :class="[
          'flex items-center justify-center rounded-lg px-2 py-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer',
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
          isActive(item.to)
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        "
        :title="collapsed ? item.name : undefined"
      >
        <template v-if="item.icon === 'vault'">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </template>
        <template v-else-if="item.icon === 'password'">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </template>
        <template v-else-if="item.icon === 'card'">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </template>
        <template v-else-if="item.icon === 'note'">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 10.414V19a2 2 0 01-2 2z"
            />
          </svg>
        </template>
        <template v-else-if="item.icon === 'generator'">
          <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </template>
        <span v-if="!collapsed">{{ item.name }}</span>
      </RouterLink>
    </nav>

    <div class="shrink-0 space-y-1 border-t border-slate-100 dark:border-slate-700/60 p-2">
      <RouterLink
        to="/settings"
        class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="
          isActive('/settings')
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        "
        :title="collapsed ? 'Settings' : undefined"
      >
        <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span v-if="!collapsed">Settings</span>
      </RouterLink>

      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 cursor-pointer"
        :disabled="auth.isSubmitting"
        :title="collapsed ? 'Log out' : undefined"
        @click="handleLogout"
      >
        <LoadingSpinner v-if="auth.isSubmitting" size="sm" class="shrink-0" />
        <svg v-else class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { useOrgVaultStore } from '@/stores/orgVault'
import LoadingSpinner from './LoadingSpinner.vue'
import ThemeToggle from './ThemeToggle.vue'

const auth = useAuthStore()
const org = useOrganizationStore()
const sharedVault = useOrgVaultStore()
const route = useRoute()
const router = useRouter()

const showOrganization = computed(() => org.isOrganization && auth.isAdmin)
const showSharedVault = computed(() => sharedVault.hasAccess)

const moreOpen = ref(false)

// Close the sheet whenever navigation happens (tapping a link inside it)
watch(
  () => route.fullPath,
  () => (moreOpen.value = false),
)

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

// Settings lives in the nav bar in both modes; the More sheet holds the rest
// (Organization link in org mode, plus theme + log out)
const moreActive = computed(() => isActive('/organization'))

async function handleLogout() {
  try {
    await auth.logOut()
    router.push('/login')
  } catch {
    window.location.href = '/login'
  }
}

// Passwords/Cards/Notes fold into the "Vault" tab (filtered in-page); the freed slots
// promote Shared and Security up from the More sheet
const tabs = computed(() => [
  { name: 'Vault', to: '/vault', icon: 'vault' },
  ...(showSharedVault.value ? [{ name: 'Shared', to: '/shared', icon: 'shared' }] : []),
  { name: 'Security', to: '/security', icon: 'security' },
  { name: 'Settings', to: '/settings', icon: 'settings' },
])
</script>

<template>
  <nav
    class="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pb-[env(safe-area-inset-bottom)] md:hidden"
    aria-label="Primary"
  >
    <div class="flex h-16 items-stretch">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors"
        :class="
          isActive(tab.to)
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
        "
      >
        <span
          class="flex h-7 w-12 items-center justify-center rounded-full transition-colors"
          :class="isActive(tab.to) ? 'bg-gray-200 dark:bg-gray-700' : ''"
        >
          <svg
            v-if="tab.icon === 'vault'"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <svg
            v-else-if="tab.icon === 'shared'"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <svg
            v-else-if="tab.icon === 'security'"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </span>
        <span class="text-[11px] font-medium leading-none">{{ tab.name }}</span>
      </RouterLink>

      <button
        type="button"
        class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
        :class="
          moreActive || moreOpen
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300'
        "
        aria-label="More"
        :aria-expanded="moreOpen"
        @click="moreOpen = !moreOpen"
      >
        <span
          class="flex h-7 w-12 items-center justify-center rounded-full transition-colors"
          :class="moreActive || moreOpen ? 'bg-gray-200 dark:bg-gray-700' : ''"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
            />
          </svg>
        </span>
        <span class="text-[11px] font-medium leading-none">More</span>
      </button>
    </div>
  </nav>

  <!-- "More" bottom sheet -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="moreOpen"
        class="fixed inset-0 z-40 bg-black/50 md:hidden"
        @click="moreOpen = false"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-250 ease-out"
      enter-from-class="translate-y-full"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="moreOpen"
        class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-2xl md:hidden"
        role="dialog"
        aria-label="More options"
      >
        <div class="flex justify-center pt-2.5 pb-1">
          <span class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        <div class="space-y-1 p-3">
          <RouterLink
            v-if="showOrganization"
            to="/organization"
            class="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            :class="
              isActive('/organization')
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
            "
          >
            <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            Organization
          </RouterLink>

          <div
            class="flex min-h-11 items-center justify-between rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400"
          >
            <span class="flex items-center gap-3">
              <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
              Theme
            </span>
            <ThemeToggle />
          </div>

          <div class="border-t border-gray-100 dark:border-gray-800 pt-1">
            <button
              type="button"
              class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 transition-colors active:bg-red-50 dark:active:bg-red-950/40 disabled:opacity-50 cursor-pointer"
              :disabled="auth.isSubmitting"
              @click="handleLogout"
            >
              <LoadingSpinner v-if="auth.isSubmitting" size="sm" class="shrink-0" />
              <svg
                v-else
                class="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {{ auth.isSubmitting ? 'Logging out...' : 'Log out' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

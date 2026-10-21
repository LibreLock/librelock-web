<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { useOrgVaultStore } from '@/stores/orgVault'
import {
  PhBuildings,
  PhDotsThree,
  PhGear,
  PhShieldCheck,
  PhSignOut,
  PhSquaresFour,
  PhUsersThree,
} from '@phosphor-icons/vue'
import { navPath } from '@/router/origin'
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

// The entry form keeps the highlight on the page it was opened from (see navPath)
const activePath = computed(() => navPath(route))

function isActive(to: string) {
  return activePath.value === to || activePath.value.startsWith(to + '/')
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
const TAB_ICONS: Record<string, Component> = {
  vault: PhSquaresFour,
  shared: PhUsersThree,
  security: PhShieldCheck,
  settings: PhGear,
}

const tabs = computed(() => [
  { name: 'Vault', to: '/vault', icon: 'vault' },
  ...(showSharedVault.value ? [{ name: 'Shared', to: '/shared', icon: 'shared' }] : []),
  { name: 'Security', to: '/security', icon: 'security' },
  { name: 'Settings', to: '/settings', icon: 'settings' },
])
</script>

<template>
  <nav
    class="material shrink-0 border-t border-gray-200/70 pb-[env(safe-area-inset-bottom)] md:hidden dark:border-white/[0.06]"
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
            : 'text-gray-500 dark:text-gray-500 active:text-gray-700 dark:active:text-gray-300'
        "
      >
        <span
          class="flex h-7 w-12 items-center justify-center rounded-full transition-colors"
          :class="isActive(tab.to) ? 'bg-gray-900/[0.07] dark:bg-white/[0.1]' : ''"
        >
          <component
            :is="TAB_ICONS[tab.icon]"
            :size="20"
            :weight="isActive(tab.to) ? 'fill' : 'regular'"
          />
        </span>
        <span class="text-[11px] font-medium leading-none">{{ tab.name }}</span>
      </RouterLink>

      <button
        type="button"
        class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
        :class="
          moreActive || moreOpen
            ? 'text-gray-900 dark:text-gray-100'
            : 'text-gray-500 dark:text-gray-500 active:text-gray-700 dark:active:text-gray-300'
        "
        aria-label="More"
        :aria-expanded="moreOpen"
        @click="moreOpen = !moreOpen"
      >
        <span
          class="flex h-7 w-12 items-center justify-center rounded-full transition-colors"
          :class="moreActive || moreOpen ? 'bg-gray-900/[0.07] dark:bg-white/[0.1]' : ''"
        >
          <PhDotsThree :size="20" weight="bold" />
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
        class="fixed inset-0 z-40 bg-gray-950/40 md:hidden"
        @click="moreOpen = false"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      enter-from-class="translate-y-full"
      leave-active-class="transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="moreOpen"
        class="fixed inset-x-2 bottom-2 z-50 rounded-[22px] bg-white pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-xl ring-1 ring-gray-900/[0.06] md:hidden dark:bg-gray-900 dark:ring-white/[0.08]"
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
                ? 'bg-gray-100 dark:bg-white/[0.08] text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800'
            "
          >
            <PhBuildings :size="20" class="shrink-0" />
            Organization
          </RouterLink>

          <ThemeToggle label="Theme" />

          <div class="border-t border-gray-100 dark:border-gray-800 pt-1">
            <button
              type="button"
              class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 transition-colors active:bg-red-50 dark:active:bg-red-950/40 disabled:opacity-50 cursor-pointer"
              :disabled="auth.isSubmitting"
              @click="handleLogout"
            >
              <LoadingSpinner v-if="auth.isSubmitting" size="sm" class="shrink-0" />
              <PhSignOut v-else :size="20" class="shrink-0" />
              {{ auth.isSubmitting ? 'Logging out...' : 'Log out' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

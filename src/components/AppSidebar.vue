<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { useOrgVaultStore } from '@/stores/orgVault'
import { navPath } from '@/router/origin'
import { APP_NAME } from '@/constants'
import {
  PhBuildings,
  PhCreditCard,
  PhGear,
  PhKey,
  PhNote,
  PhShieldCheck,
  PhSidebarSimple,
  PhSignOut,
  PhSquaresFour,
  PhUsersThree,
} from '@phosphor-icons/vue'
import AppBrand from './AppBrand.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import UserAvatar from './UserAvatar.vue'

const STORAGE_KEY = 'sidebar-collapsed'
const auth = useAuthStore()
const org = useOrganizationStore()
const sharedVault = useOrgVaultStore()
const router = useRouter()
const route = useRoute()

const showOrganization = computed(() => org.isOrganization && auth.isAdmin)
const showSharedVault = computed(() => sharedVault.hasAccess)

// Below md the sidebar is hidden entirely (AppBottomNav takes over), so
// collapsed only matters on desktop
const collapsed = ref(false)

function toggleCollapse() {
  // While the rail resizes, the highlight tracks every frame without easing of its own; a second,
  // slower animation chasing the first is what made collapsing look laggy
  indicatorReady.value = false
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
}

function onAsideTransitionEnd(e: TransitionEvent) {
  if (e.target !== asideEl.value || e.propertyName !== 'width') return
  measure()
  requestAnimationFrame(() => (indicatorReady.value = true))
}

async function handleLogout() {
  try {
    await auth.logOut()
    router.push('/login')
  } catch {
    window.location.href = '/login'
  }
}

// The entry form has no nav item of its own, so it keeps the highlight on the page it was opened
// from rather than lighting up All Items
const activePath = computed(() => navPath(route))

function isActive(to: string) {
  return activePath.value === to || activePath.value.startsWith(to + '/')
}

const ICONS: Record<string, Component> = {
  vault: PhSquaresFour,
  password: PhKey,
  card: PhCreditCard,
  note: PhNote,
  shared: PhUsersThree,
  security: PhShieldCheck,
  organization: PhBuildings,
  settings: PhGear,
}

type NavItem = { name: string; to: string; icon: string }

const vaultItems = computed<NavItem[]>(() => [
  { name: 'All Items', to: '/vault', icon: 'vault' },
  { name: 'Passwords', to: '/passwords', icon: 'password' },
  { name: 'Cards', to: '/cards', icon: 'card' },
  { name: 'Notes', to: '/notes', icon: 'note' },
  ...(showSharedVault.value ? [{ name: 'Shared', to: '/shared', icon: 'shared' }] : []),
])

const toolItems = computed<NavItem[]>(() => [
  { name: 'Security Center', to: '/security', icon: 'security' },
  ...(showOrganization.value
    ? [{ name: 'Organization', to: '/organization', icon: 'organization' }]
    : []),
  { name: 'Settings', to: '/settings', icon: 'settings' },
])

const groups = computed(() => [
  { label: 'Vault', items: vaultItems.value },
  { label: 'Manage', items: toolItems.value },
])

const accountSubtitle = computed(() => {
  const role = auth.user?.role
  if (!org.isOrganization || !role) return 'Personal vault'
  const roleLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)}`
  // The default name is just the product's; only a name the organization chose says anything
  return org.name === APP_NAME ? roleLabel : `${roleLabel} · ${org.name}`
})

// One highlight that glides between rows instead of each row lighting up on its own: the move
// shows where you came from and where you landed. Measured from the DOM so it follows collapse,
// items appearing (Shared, Organization) and the scroll position of the nav
const asideEl = ref<HTMLElement | null>(null)
const navEl = ref<HTMLElement | null>(null)
const indicator = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const indicatorReady = ref(false)

function measure() {
  const aside = asideEl.value
  const el = aside?.querySelector<HTMLElement>('[data-active="true"]')
  if (!aside || !el) {
    indicator.value = null
    return
  }
  const a = aside.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  indicator.value = { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }
}

watch([activePath, collapsed, vaultItems, toolItems], () => nextTick(measure))

let observer: ResizeObserver | undefined

onMounted(() => {
  collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'
  nextTick(() => {
    measure()
    // First placement lands without a slide; only later moves animate
    requestAnimationFrame(() => (indicatorReady.value = true))
  })
  observer = new ResizeObserver(measure)
  if (asideEl.value) observer.observe(asideEl.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <aside
    ref="asideEl"
    class="relative hidden h-dvh shrink-0 flex-col transition-[width] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none md:flex"
    :class="collapsed ? 'w-[76px]' : 'w-[272px]'"
    @transitionend="onAsideTransitionEnd"
  >
    <div
      v-if="indicator"
      aria-hidden="true"
      class="pointer-events-none absolute left-0 top-0 rounded-[10px] bg-white shadow-[0_1px_2px_rgb(17_17_19/0.06),0_0_0_0.5px_rgb(17_17_19/0.06)] motion-reduce:transition-none dark:bg-white/[0.08] dark:shadow-[inset_0_0.5px_0_rgb(255_255_255/0.08)]"
      :class="
        indicatorReady
          ? 'transition-[transform,width] duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)]'
          : ''
      "
      :style="{
        transform: `translate(${indicator.x}px, ${indicator.y}px)`,
        width: `${indicator.w}px`,
        height: `${indicator.h}px`,
      }"
    />

    <div
      class="flex shrink-0 items-center"
      :class="collapsed ? 'h-16 justify-center px-3' : 'h-16 gap-3 pl-5 pr-3'"
    >
      <RouterLink v-if="!collapsed" to="/" class="flex min-w-0 items-center" aria-label="Home">
        <AppBrand
          size="md"
          name-class="truncate text-base font-semibold tracking-[-0.01em] text-gray-900 dark:text-gray-100"
        />
      </RouterLink>
      <button
        type="button"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :class="[
          'flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-900/[0.05] hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 cursor-pointer',
          !collapsed && 'ml-auto',
        ]"
        @click="toggleCollapse"
      >
        <PhSidebarSimple :size="20" />
      </button>
    </div>

    <nav
      ref="navEl"
      class="flex-1 overflow-y-auto px-3 pb-3"
      aria-label="Primary"
      @scroll.passive="measure"
    >
      <div v-for="(group, gi) in groups" :key="group.label" :class="gi > 0 && 'mt-6'">
        <p
          v-if="!collapsed"
          class="mb-1.5 px-3 text-xs font-medium text-gray-400 dark:text-gray-500"
        >
          {{ group.label }}
        </p>
        <div
          v-else-if="gi > 0"
          class="mx-auto mb-3 h-px w-6 bg-gray-900/[0.08] dark:bg-white/[0.08]"
        />

        <div class="space-y-1">
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :data-active="isActive(item.to)"
            class="group relative flex h-10 items-center gap-3 rounded-[10px] text-[14.5px] font-medium"
            :class="[
              collapsed ? 'justify-center' : 'px-3',
              isActive(item.to)
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 hover:bg-gray-900/[0.035] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100',
            ]"
            :title="collapsed ? item.name : undefined"
          >
            <component
              :is="ICONS[item.icon]"
              :size="20"
              :weight="isActive(item.to) ? 'fill' : 'regular'"
              class="shrink-0 transition-colors"
              :class="
                isActive(item.to)
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'
              "
            />
            <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- Who is signed in, and the way out, in one place -->
    <div class="shrink-0 p-3">
      <div
        class="flex items-center gap-2.5 rounded-xl"
        :class="
          collapsed
            ? 'flex-col py-1'
            : 'bg-white/60 p-2 shadow-[0_0_0_0.5px_rgb(17_17_19/0.06)] dark:bg-white/[0.03] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.06)]'
        "
      >
        <UserAvatar
          :name="auth.user?.username"
          :title="collapsed ? auth.user?.username : undefined"
        />
        <div v-if="!collapsed" class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ auth.user?.username }}
          </p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
            {{ accountSubtitle }}
          </p>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/[0.08] hover:text-red-600 disabled:opacity-50 cursor-pointer dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          :disabled="auth.isSubmitting"
          aria-label="Log out"
          title="Log out"
          @click="handleLogout"
        >
          <LoadingSpinner v-if="auth.isSubmitting" size="sm" />
          <PhSignOut v-else :size="19" />
        </button>
      </div>
    </div>
  </aside>
</template>

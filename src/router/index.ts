import { createRouter, createWebHistory } from 'vue-router'

import { pinia } from '@/stores/pinia'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { setUnauthorizedHandler } from '@/services/api'
import { listenTabSync, broadcastKeyResponse } from '@/services/tabsync'
import { getVaultKey, getPrivateKey, getOrgKey } from '@/services/keyring'

import AppLayout from '../layouts/AppLayout.vue'
import NotFoundView from '../views/not-found/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/vault',
        },
        {
          path: 'vault',
          name: 'vault',
          component: () => import('../views/vault/VaultView.vue'),
        },
        {
          path: 'vault/new',
          name: 'vault-new',
          component: () => import('../views/vault/EntryFormView.vue'),
        },
        {
          path: 'vault/edit/:id',
          name: 'vault-edit',
          component: () => import('../views/vault/EntryFormView.vue'),
        },
        {
          path: 'vault/:id',
          name: 'vault-entry',
          component: () => import('../views/vault/VaultView.vue'),
        },
        {
          path: 'passwords',
          name: 'passwords',
          component: () => import('../views/passwords/PasswordsView.vue'),
        },
        {
          path: 'passwords/:id',
          name: 'passwords-entry',
          component: () => import('../views/passwords/PasswordsView.vue'),
        },
        {
          path: 'cards',
          name: 'cards',
          component: () => import('../views/cards/CardsView.vue'),
        },
        {
          path: 'cards/:id',
          name: 'cards-entry',
          component: () => import('../views/cards/CardsView.vue'),
        },
        {
          path: 'notes',
          name: 'notes',
          component: () => import('../views/notes/NotesView.vue'),
        },
        {
          path: 'notes/:id',
          name: 'notes-entry',
          component: () => import('../views/notes/NotesView.vue'),
        },
        {
          path: 'shared',
          name: 'shared',
          component: () => import('../views/shared/SharedVaultView.vue'),
        },
        {
          path: 'shared/:id',
          name: 'shared-entry',
          component: () => import('../views/shared/SharedVaultView.vue'),
        },
        {
          path: 'security',
          name: 'security',
          component: () => import('../views/security/SecurityCenterView.vue'),
        },
        {
          // The old generator page now lives inside the Security Center
          path: 'generator',
          redirect: '/security',
        },
        {
          path: 'organization',
          name: 'organization',
          component: () => import('../views/organization/OrganizationView.vue'),
          meta: { requiresAdmin: true },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/settings/SettingsView.vue'),
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/:pathMatch(.*)*',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'not-found',
          component: NotFoundView,
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const guestOnly = to.matched.some((r) => r.meta.guestOnly)

  if (requiresAuth || guestOnly) {
    if (auth.status === 'idle') {
      await auth.refreshSession()
    }
  }

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (guestOnly && auth.isAuthenticated) {
    return { name: 'vault' }
  }

  // Organization page: organization mode + admin only
  if (to.matched.some((r) => r.meta.requiresAdmin)) {
    const org = useOrganizationStore(pinia)
    if (!org.loaded) await org.load()
    if (!org.isOrganization || !auth.isAdmin) {
      return { name: 'vault' }
    }
  }

  return true
})

setUnauthorizedHandler(async () => {
  const auth = useAuthStore(pinia)
  if (!auth.isAuthenticated) return
  await auth.logOut()
  // Flag in memory (not the URL) so the login screen can explain the bounce; a manual refresh clears it
  auth.sessionExpired = true
  router.push({ name: 'login' })
})

listenTabSync(async (msg) => {
  const auth = useAuthStore(pinia)
  if (msg.type === 'auth') {
    if (auth.isAuthenticated) return
    await auth.receiveTabAuth(
      { key: msg.key, privateKey: msg.privateKey, orgKey: msg.orgKey },
      msg.user,
    )
    router.replace('/')
  } else if (msg.type === 'logout') {
    if (!auth.isAuthenticated) return
    await auth.logOut(false)
    router.push('/login')
  } else if (msg.type === 'request-key') {
    const key = getVaultKey()
    if (key && auth.user) {
      broadcastKeyResponse({ key, privateKey: getPrivateKey(), orgKey: getOrgKey() }, auth.user)
    }
  }
})

export default router

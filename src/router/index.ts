import { createRouter, createWebHistory } from 'vue-router'

import { pinia } from '@/stores/pinia'
import { useAuthStore } from '@/stores/auth'

import AppLayout from '../layouts/AppLayout.vue'

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
        // Vault — static paths before dynamic :id
        {
          path: 'vault',
          name: 'vault',
          component: () => import('../views/vault/VaultView.vue'),
        },
        {
          path: 'vault/new',
          name: 'vault-new',
          component: () => import('../views/vault/AddEntryView.vue'),
        },
        {
          path: 'vault/edit/:id',
          name: 'vault-edit',
          component: () => import('../views/vault/AddEntryView.vue'),
        },
        {
          path: 'vault/:id',
          name: 'vault-entry',
          component: () => import('../views/vault/VaultView.vue'),
        },
        // Passwords
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
        // Notes
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
        // Other
        {
          path: 'security',
          name: 'security',
          component: () => import('../views/security/SecurityCenterView.vue'),
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
      redirect: '/',
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

  return true
})

export default router

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useAuthStore, fetchKdfParams } from '@/stores/auth'
import { useOrganizationStore } from '@/stores/organization'
import { deriveKeys, unwrapKey } from '@/services/crypto'
import { MAX_PASSWORD_LENGTH } from '@/constants'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import router from '@/router'

const auth = useAuthStore()
const org = useOrganizationStore()

interface InstanceInfo {
  registration: 'open' | 'closed'
  is_first_account: boolean
  first_account_username: string
}

// Both controls here are instance-wide and belong to the oldest account; the server enforces it too
const instance = ref<InstanceInfo | null>(null)
const isLoading = ref(true)
const isFirstAccount = computed(() => instance.value?.is_first_account === true)
const operator = computed(() => instance.value?.first_account_username ?? '')

onMounted(async () => {
  try {
    const data = await apiRequest<{ instance: InstanceInfo }>('/settings/instance')
    instance.value = data?.instance ?? null
  } catch {
    // Leave it unresolved: the read-only notice is the safe thing to show when we cannot tell
    instance.value = null
  } finally {
    isLoading.value = false
  }
})

// Sign-up for additional accounts on this personal instance (off until explicitly enabled)
const registrationOpen = computed(() => org.registration === 'open')
const isSavingRegistration = ref(false)
const registrationError = ref<string | null>(null)
const showRegistrationModal = ref(false)

async function applyRegistration(open: boolean) {
  registrationError.value = null
  isSavingRegistration.value = true
  try {
    await org.setPersonalRegistration(open)
  } catch (err) {
    registrationError.value = err instanceof ApiError ? err.message : 'Failed to update sign-up.'
  } finally {
    isSavingRegistration.value = false
  }
}

// Opening sign-up is the risky direction, so confirm it; closing is instant
function onRegistrationChange(next: boolean) {
  if (isSavingRegistration.value) return
  if (next) {
    showRegistrationModal.value = true
  } else {
    applyRegistration(false)
  }
}

async function confirmOpenRegistration() {
  showRegistrationModal.value = false
  await applyRegistration(true)
}

// Switch to organization mode, confirmed with the master password
const showSwitchModal = ref(false)
const isSwitching = ref(false)
const switchError = ref<string | null>(null)
const switchPassword = ref('')
const showSwitchPassword = ref(false)

function openSwitchModal() {
  switchError.value = null
  switchPassword.value = ''
  showSwitchModal.value = true
}

async function confirmSwitchToOrganization() {
  if (!switchPassword.value) return
  switchError.value = null
  isSwitching.value = true
  try {
    const username = auth.user?.username
    const currentProtectedKey = auth.user?.protected_key
    if (!username || !currentProtectedKey) throw new Error('Not logged in.')

    // Derive + validate the password locally, then send the auth credential
    const kdfParams = await fetchKdfParams(username)
    const { wrappingKey, authCredential } = await deriveKeys(switchPassword.value, kdfParams)
    await unwrapKey(currentProtectedKey, wrappingKey) // throws on wrong password

    await org.switchToOrganization(authCredential)
    await auth.refreshSession() // pick up the new owner role
    showSwitchModal.value = false
    switchPassword.value = ''
    router.push('/organization')
  } catch (err) {
    switchError.value = err instanceof ApiError ? err.message : 'Invalid password.'
  } finally {
    isSwitching.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="isLoading" class="flex justify-center py-10">
      <LoadingSpinner />
    </div>

    <!-- Read-only view: these settings belong to the first account, so show who to ask instead of dead controls -->
    <div
      v-else-if="!isFirstAccount"
      class="rounded-xl bg-amber-50 dark:bg-amber-950/30 shadow-sm ring-1 ring-amber-200 dark:ring-amber-900/60"
    >
      <div class="px-4 sm:px-6 py-6">
        <div class="flex items-start gap-3">
          <svg
            class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-amber-900 dark:text-amber-200">
              <template v-if="operator">Managed by {{ operator }}</template>
              <template v-else>Managed by the first account</template>
            </h2>
            <p class="mt-1 text-sm text-amber-800 dark:text-amber-200/80">
              These settings apply to the whole instance: who may create an account here, and
              whether this becomes an organization. Only the first account created on this instance
              <template v-if="operator">
                - <strong class="font-semibold">{{ operator }}</strong> -
              </template>
              can change them.
            </p>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div
        class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
      >
        <div class="px-4 sm:px-6 pt-6 pb-1">
          <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Sign-up</h2>
          <p class="mt-0.5 text-sm text-gray-400">
            Whether anyone else can create an account on this instance
          </p>
        </div>

        <hr class="mt-3 border-gray-100 dark:border-gray-700" />

        <p v-if="registrationError" class="px-4 sm:px-6 pt-4 text-sm text-red-600">
          {{ registrationError }}
        </p>

        <div class="flex items-start justify-between gap-4 px-4 sm:px-6 py-5">
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">Allow new accounts</p>
            <p class="mt-1 text-xs text-gray-400">
              Off (default): this instance accepts no further sign-ups. Turn it on if you want
              several personal accounts on the same server - each account keeps its own separate,
              private vault, with nothing shared between them. If you are setting this up for a
              team, switch to organization mode below instead: it adds roles, invites, a shared
              vault, and an audit log. While this is on, anyone who can reach this instance can
              create an account.
            </p>
          </div>

          <ToggleSwitch
            class="mt-0.5"
            :model-value="registrationOpen"
            :disabled="isSavingRegistration"
            @change="onRegistrationChange"
          />
        </div>
      </div>

      <div
        class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
      >
        <div class="px-4 sm:px-6 pt-6 pb-1">
          <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">
            Switch to organization
          </h2>
          <p class="mt-0.5 text-sm text-gray-400">
            Turn this instance into a company workspace with roles, invites, and admin controls
          </p>
        </div>

        <hr class="mt-3 border-gray-100 dark:border-gray-700" />

        <div class="px-4 sm:px-6 py-5 space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Organization mode adds admin / member roles, an Organization admin area, white-label
            branding, invite-only registration, suspend, and an audit log. You become the owner of
            the organization.
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            You can return to personal mode later from the Organization area, but doing so
            permanently deletes every other account and all organization data. Your own account and
            vault are kept.
          </p>
          <button
            type="button"
            class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 cursor-pointer"
            @click="openSwitchModal"
          >
            Switch to organization…
          </button>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="showSwitchModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showSwitchModal = false"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Switch to organization mode?
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This instance will gain roles, an admin area, invites, suspend, and an audit log. Your
            account becomes the owner of the organization. Existing vault data is kept.
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Any other account already registered here becomes a member of your organization.
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            You can return to personal mode later from the Organization area, but doing so
            permanently deletes every other account and all organization data. Your own account and
            vault are kept.
          </p>

          <div class="mt-4">
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              Confirm with your master password
            </label>
            <div class="relative">
              <input
                v-model="switchPassword"
                :type="showSwitchPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :maxlength="MAX_PASSWORD_LENGTH"
                class="w-full rounded-md border px-3 py-1.5 pr-10 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
                @keyup.enter="confirmSwitchToOrganization"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                @click="showSwitchPassword = !showSwitchPassword"
              >
                <svg
                  v-if="showSwitchPassword"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>

                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <p v-if="switchError" class="mt-3 text-sm text-red-600">{{ switchError }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer disabled:opacity-50"
              :disabled="isSwitching"
              @click="showSwitchModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isSwitching || !switchPassword"
              @click="confirmSwitchToOrganization"
            >
              {{ isSwitching ? 'Switching…' : 'Switch to organization' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="showRegistrationModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showRegistrationModal = false"
      >
        <div
          class="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700"
        >
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Allow new accounts?</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Anyone who can reach this instance will be able to create an account. Only enable this
            if the instance is on a trusted, restricted network.
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            This is meant for a handful of separate personal vaults on one server. For a team, use
            organization mode: it keeps sign-up invite-only and adds roles, a shared vault, and an
            audit log.
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            You can turn it off again at any time.
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              @click="showRegistrationModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
              @click="confirmOpenRegistration"
            >
              Allow new accounts
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

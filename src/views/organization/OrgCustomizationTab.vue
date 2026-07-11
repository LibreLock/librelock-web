<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ApiError, apiRequest } from '@/services/api'
import { useOrganizationStore, type Organization } from '@/stores/organization'
import AppBrand from '@/components/AppBrand.vue'

const org = useOrganizationStore()

const MAX_LOGO_BYTES = 512 * 1024

const form = ref({
  name: '',
  support_email: '',
  support_url: '',
  login_message: '',
})

const detailsError = ref<string | null>(null)
const detailsSuccess = ref(false)
const isSaving = ref(false)

const logoError = ref<string | null>(null)
const isUploadingLogo = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function syncForm() {
  form.value = {
    name: org.org?.name ?? '',
    support_email: org.org?.support_email ?? '',
    support_url: org.org?.support_url ?? '',
    login_message: org.org?.login_message ?? '',
  }
}

onMounted(async () => {
  if (!org.loaded) await org.load()
  syncForm()
})

async function saveDetails() {
  detailsError.value = null
  detailsSuccess.value = false
  isSaving.value = true
  try {
    const data = await apiRequest<{ organization: Organization }>('/organization', {
      method: 'PUT',
      body: JSON.stringify(form.value),
    })
    if (data?.organization) org.apply(data.organization)
    detailsSuccess.value = true
    syncForm()
  } catch (err) {
    detailsError.value = err instanceof ApiError ? err.message : 'Failed to save customization.'
  } finally {
    isSaving.value = false
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

async function onLogoSelected(event: Event) {
  logoError.value = null
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > MAX_LOGO_BYTES) {
    logoError.value = 'Logo must be 512 KiB or smaller.'
    input.value = ''
    return
  }

  isUploadingLogo.value = true
  try {
    const dataUrl = await readFileAsDataUrl(file)
    const data = await apiRequest<{ organization: Organization }>('/organization/logo', {
      method: 'PUT',
      body: JSON.stringify({ data: dataUrl }),
    })
    if (data?.organization) org.apply(data.organization)
  } catch (err) {
    logoError.value = err instanceof ApiError ? err.message : 'Failed to upload logo.'
  } finally {
    isUploadingLogo.value = false
    input.value = ''
  }
}

async function removeLogo() {
  logoError.value = null
  isUploadingLogo.value = true
  try {
    const data = await apiRequest<{ organization: Organization }>('/organization/logo', {
      method: 'DELETE',
    })
    if (data?.organization) org.apply(data.organization)
  } catch (err) {
    logoError.value = err instanceof ApiError ? err.message : 'Failed to remove logo.'
  } finally {
    isUploadingLogo.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Logo -->
    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Company logo</h2>
        <p class="mt-0.5 text-sm text-gray-400">
          Replaces the default LibreLock padlock across the app and login screen
        </p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5">
        <div class="flex items-center gap-4">
          <AppBrand size="lg" :show-name="false" />
          <div class="space-x-2">
            <button
              type="button"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              :disabled="isUploadingLogo"
              @click="fileInput?.click()"
            >
              {{ isUploadingLogo ? 'Uploading…' : org.hasLogo ? 'Replace logo' : 'Upload logo' }}
            </button>
            <button
              v-if="org.hasLogo"
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 ring-1 ring-gray-300 dark:ring-gray-600 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
              :disabled="isUploadingLogo"
              @click="removeLogo"
            >
              Reset to default
            </button>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            class="hidden"
            @change="onLogoSelected"
          />
        </div>
        <p class="mt-3 text-xs text-gray-400">PNG, JPEG, SVG, WebP or GIF. Max 512 KiB</p>
        <p v-if="logoError" class="mt-2 text-sm text-red-600">{{ logoError }}</p>
      </div>
    </div>

    <!-- Details -->
    <div
      class="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
    >
      <div class="px-4 sm:px-6 pt-6 pb-1">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-200">Branding</h2>
        <p class="mt-0.5 text-sm text-gray-400">Company name and support details</p>
      </div>

      <hr class="mt-3 border-gray-100 dark:border-gray-700" />

      <div class="px-4 sm:px-6 py-5">
        <form class="space-y-4" @submit.prevent="saveDetails">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
              >Company name</label
            >
            <input
              v-model="form.name"
              type="text"
              placeholder="LibreLock"
              maxlength="200"
              class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />
            <p class="mt-1 text-xs text-gray-400">Leave blank to fall back to “LibreLock”</p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
              >Support email</label
            >
            <input
              v-model="form.support_email"
              type="email"
              placeholder="support@company.com"
              maxlength="200"
              class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
              >Support URL</label
            >
            <input
              v-model="form.support_url"
              type="text"
              placeholder="help.company.com"
              maxlength="300"
              class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400"
              >Login message</label
            >
            <textarea
              v-model="form.login_message"
              rows="2"
              placeholder="Shown under the logo on the login screen"
              maxlength="500"
              class="w-full rounded-md border px-3 py-1.5 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition"
            />
          </div>

          <p v-if="detailsError" class="text-sm text-red-600">{{ detailsError }}</p>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              class="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              :disabled="isSaving"
            >
              {{ isSaving ? 'Saving…' : 'Save changes' }}
            </button>
            <p v-if="detailsSuccess" class="text-sm text-emerald-600">Customization saved</p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

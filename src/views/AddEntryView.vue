<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, apiRequest } from '@/services/api'

const router = useRouter()

type EntryType = 'account' | 'note'

const entryType = ref<EntryType>('account')

const account = reactive({
  name: '',
  username: '',
  email: '',
  url: '',
  notes: '',
})

const noteContent = ref('')

const isSubmitting = ref(false)
const error = ref<string | null>(null)

function switchType(type: EntryType) {
  entryType.value = type
  error.value = null
}

async function handleSubmit() {
  error.value = null
  isSubmitting.value = true

  try {
    if (entryType.value === 'account') {
      await apiRequest('/vault/entries', {
        method: 'POST',
        body: JSON.stringify({ type: 'account', ...account }),
      })
    } else {
      await apiRequest('/vault/entries', {
        method: 'POST',
        body: JSON.stringify({ type: 'note', content: noteContent.value }),
      })
    }
    router.push('/vault')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to save entry.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <div class="w-full max-w-lg">
      <RouterLink
        to="/vault"
        class="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to vault
      </RouterLink>

      <h1 class="text-2xl font-semibold mb-4">Add entry</h1>

      <!-- Type selector -->
      <div class="flex gap-1 rounded-lg bg-slate-100 p-1 mb-6 w-fit">
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer"
          :class="
            entryType === 'account'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="switchType('account')"
        >
          Account password
        </button>
        <button
          type="button"
          class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer"
          :class="
            entryType === 'note'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="switchType('note')"
        >
          Secure note
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-6">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <template v-if="entryType === 'account'">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">
                Name <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="account.name"
                type="text"
                required
                class="w-full rounded-md border px-3 py-2 border-slate-400"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Username</label>
              <input
                v-model="account.username"
                type="text"
                class="w-full rounded-md border px-3 py-2 border-slate-400"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">
                Email <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="account.email"
                type="email"
                required
                class="w-full rounded-md border px-3 py-2 border-slate-400"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">URL</label>
              <input
                v-model="account.url"
                type="url"
                class="w-full rounded-md border px-3 py-2 border-slate-400"
              />
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Notes</label>
              <textarea
                v-model="account.notes"
                rows="4"
                class="w-full rounded-md border px-3 py-2 border-slate-400 resize-none"
              />
            </div>
          </template>

          <template v-else>
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">
                Note <span class="text-rose-500">*</span>
              </label>
              <textarea
                v-model="noteContent"
                rows="10"
                required
                class="w-full rounded-md border px-3 py-2 border-slate-400 resize-none"
              />
            </div>
          </template>

          <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>

          <button
            type="submit"
            class="w-full rounded-md bg-gray-600 text-white py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? 'Saving...' : 'Save entry' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

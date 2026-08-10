<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppUnreachable from '@/components/AppUnreachable.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { isOffline } from '@/services/connectivity'
import { useOrganizationStore } from '@/stores/organization'

// Load company branding once on startup so logo/name are ready before render
const org = useOrganizationStore()
onMounted(() => org.load())

// A navigation the guard aborted (server unreachable) never lands, so nothing mounts under
// RouterView. Track the first navigation that did land: until then this component takes over the
// boot shell's job - spinner while the session check is in flight, unreachable screen once it turns
// out there is no server to reach - instead of leaving an empty page behind
const router = useRouter()
const booted = ref(router.currentRoute.value.matched.length > 0)

// The failure argument is the whole point: afterEach also runs for navigations that were aborted
// or redirected away, and isReady() resolves for those too, so neither one on its own tells us
// whether anything is actually mounted under RouterView
router.afterEach((to, _from, failure) => {
  if (!failure && to.matched.length) booted.value = true
})
</script>

<template>
  <AppUnreachable v-if="isOffline && !booted" />

  <div
    v-else-if="!booted"
    class="boot-fade flex min-h-screen items-center justify-center bg-gray-50 text-gray-400 dark:bg-gray-950 dark:text-gray-500"
  >
    <LoadingSpinner size="lg" />
  </div>

  <template v-else>
    <RouterView />
    <AppUnreachable v-if="isOffline" variant="banner" />
  </template>
</template>

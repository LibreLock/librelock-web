<script setup lang="ts">
import { computed } from 'vue'
import { useOrganizationStore } from '@/stores/organization'

const org = useOrganizationStore()

const hasSupport = computed(() => Boolean(org.supportEmail || org.supportUrl))

// User may type a bare host ("lan.si"); add a scheme so it isn't treated as a
// relative link. Leave existing schemes (https://, http://, mailto:) untouched.
const supportHref = computed(() => {
  const url = org.supportUrl
  if (!url) return ''
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
})
</script>

<template>
  <p
    v-if="hasSupport"
    class="mt-6 flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400"
  >
    <a
      v-if="org.supportEmail"
      :href="`mailto:${org.supportEmail}`"
      class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      Contact support
    </a>
    <span v-if="org.supportEmail && org.supportUrl" aria-hidden="true">·</span>
    <a
      v-if="org.supportUrl"
      :href="supportHref"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      Help center
    </a>
  </p>
</template>

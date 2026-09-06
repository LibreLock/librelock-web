<script setup lang="ts">
import { computed } from 'vue'
import { useOrganizationStore } from '@/stores/organization'
import { externalHref } from '@/services/url'

const org = useOrganizationStore()

const supportHref = computed(() => externalHref(org.supportUrl))

const hasSupport = computed(() => Boolean(org.supportEmail || supportHref.value))
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
    <span v-if="org.supportEmail && supportHref" aria-hidden="true">·</span>
    <a
      v-if="supportHref"
      :href="supportHref"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
    >
      Help center
    </a>
  </p>
</template>

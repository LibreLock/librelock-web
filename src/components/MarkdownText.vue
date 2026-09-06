<script setup lang="ts">
import { computed } from 'vue'

import { renderMarkdown } from '@/services/markdown'
import { NOTE_CLASS } from '@/services/noteStyles'

const props = defineProps<{ text: string | null | undefined }>()

const html = computed(() => renderMarkdown(props.text))
</script>

<template>
  <div :class="NOTE_CLASS.body" v-html="html" />
</template>

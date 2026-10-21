<script setup lang="ts">
import { computed } from 'vue'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

const BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-35 cursor-pointer dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-100'
</script>

<template>
  <!-- Nothing to page through: stay out of the way -->
  <nav
    v-if="pageCount > 1"
    class="flex items-center justify-between gap-3 text-[13px] text-gray-500 dark:text-gray-400"
    aria-label="Pagination"
  >
    <span class="tabular-nums">{{ from }}-{{ to }} of {{ total }}</span>
    <div class="flex items-center gap-1">
      <button
        type="button"
        :class="BUTTON"
        :disabled="page <= 1"
        aria-label="Previous page"
        @click="emit('update:page', page - 1)"
      >
        <PhCaretLeft :size="16" />
      </button>
      <span class="min-w-14 text-center tabular-nums">{{ page }} / {{ pageCount }}</span>
      <button
        type="button"
        :class="BUTTON"
        :disabled="page >= pageCount"
        aria-label="Next page"
        @click="emit('update:page', page + 1)"
      >
        <PhCaretRight :size="16" />
      </button>
    </div>
  </nav>
</template>

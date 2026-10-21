import { computed, ref, watch, type Ref } from 'vue'

/**
 * Client-side paging over a list that is already loaded. The page clamps itself when the list
 * shrinks (a user removed, a session revoked) so it never lands on an empty page.
 */
export function usePagination<T>(items: Ref<T[]>, pageSize = 10) {
  const page = ref(1)
  const pageCount = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)))

  watch(pageCount, (count) => {
    if (page.value > count) page.value = count
  })

  const paged = computed(() =>
    items.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  )

  return { page, pageCount, pageSize, paged, total: computed(() => items.value.length) }
}

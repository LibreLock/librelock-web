import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePagination } from './usePagination'

describe('usePagination', () => {
  it('slices the list into pages', () => {
    const items = ref(Array.from({ length: 23 }, (_, i) => i))
    const { page, pageCount, paged } = usePagination(items, 10)
    expect(pageCount.value).toBe(3)
    expect(paged.value).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    page.value = 3
    expect(paged.value).toEqual([20, 21, 22])
  })

  it('steps back when the last page empties out', async () => {
    const items = ref(Array.from({ length: 11 }, (_, i) => i))
    const { page, paged } = usePagination(items, 10)
    page.value = 2
    items.value = items.value.slice(0, 10)
    await nextTick()
    expect(page.value).toBe(1)
    expect(paged.value).toHaveLength(10)
  })

  it('always has at least one page', () => {
    const { pageCount, paged } = usePagination(ref<number[]>([]), 10)
    expect(pageCount.value).toBe(1)
    expect(paged.value).toEqual([])
  })
})

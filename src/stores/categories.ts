import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createCategory, getCategories, type VaultCategory } from '@/api/categories'

export type { VaultCategory }

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<VaultCategory[]>([])
  const loading = ref(false)

  async function fetchCategories() {
    if (loading.value || categories.value.length > 0) return
    loading.value = true
    try {
      categories.value = await getCategories()
    } finally {
      loading.value = false
    }
  }

  async function addCategory(name: string): Promise<VaultCategory> {
    const cat = await createCategory(name)
    categories.value.push(cat)
    return cat
  }

  function getCategoryName(id: string | null): string {
    if (!id) return ''
    return categories.value.find((c) => c.id === id)?.name ?? ''
  }

  return { categories, loading, fetchCategories, addCategory, getCategoryName }
})

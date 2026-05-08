import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type VaultCategory,
} from '@/api/categories'
import { useVaultStore } from '@/stores/vault'

export type { VaultCategory }

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<VaultCategory[]>([])
  const loading = ref(false)

  async function fetchCategories() {
    if (loading.value) return
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

  async function editCategory(id: string, name: string): Promise<VaultCategory> {
    const cat = await updateCategory(id, name)
    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx !== -1) categories.value[idx] = cat
    return cat
  }

  async function removeCategory(id: string): Promise<void> {
    await deleteCategory(id)
    categories.value = categories.value.filter((c) => c.id !== id)
    for (const entry of useVaultStore().entries) {
      if (entry.categoryId === id) entry.categoryId = null
    }
  }

  function getCategoryName(id: string | null): string {
    if (!id) return ''
    return categories.value.find((c) => c.id === id)?.name ?? ''
  }

  function clear() {
    categories.value = []
  }

  return {
    categories,
    loading,
    fetchCategories,
    addCategory,
    editCategory,
    removeCategory,
    getCategoryName,
    clear,
  }
})

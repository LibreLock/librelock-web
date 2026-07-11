import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createOrgCategory,
  deleteOrgCategory,
  getOrgCategories,
  updateOrgCategory,
} from '@/api/orgCategories'
import type { VaultCategory } from '@/api/categories'
import { useOrgVaultStore } from '@/stores/orgVault'

// Mirrors the personal categories store, but for shared entries
// Only populated when the org key is present (the API returns [] otherwise)
export const useOrgCategoriesStore = defineStore('orgCategories', () => {
  const categories = ref<VaultCategory[]>([])
  const loading = ref(false)

  async function fetchCategories() {
    if (loading.value) return
    loading.value = true
    try {
      categories.value = await getOrgCategories()
    } catch {
      // No session or no shared access yet: leave categories empty rather than letting a fire-and-forget onMounted call reject unhandled
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  async function addCategory(name: string): Promise<VaultCategory> {
    const cat = await createOrgCategory(name)
    categories.value.push(cat)
    return cat
  }

  async function editCategory(id: string, name: string): Promise<VaultCategory> {
    const cat = await updateOrgCategory(id, name)
    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx !== -1) categories.value[idx] = cat
    return cat
  }

  async function removeCategory(id: string): Promise<void> {
    await deleteOrgCategory(id)
    categories.value = categories.value.filter((c) => c.id !== id)
    for (const entry of useOrgVaultStore().entries) {
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

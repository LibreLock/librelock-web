// Mock API layer for categories.
// When the backend is ready, replace each function body with the real apiRequest call shown in comments.

// import { apiRequest } from '@/services/api'

export interface VaultCategory {
  id: string
  name: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockCategories: VaultCategory[] = [
  { id: 'work', name: 'Work' },
  { id: 'personal', name: 'Personal' },
  { id: 'finance', name: 'Finance' },
  { id: 'social', name: 'Social' },
  { id: 'dev', name: 'Development' },
]

let nextCatId = 100

function delay(ms = 150): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<VaultCategory[]> {
  // Real: return apiRequest<VaultCategory[]>('/categories')
  await delay()
  return mockCategories.map((c) => ({ ...c }))
}

export async function createCategory(name: string): Promise<VaultCategory> {
  // Real: return apiRequest<VaultCategory>('/categories', { method: 'POST', body: JSON.stringify({ name }) })
  await delay()
  const cat: VaultCategory = { id: String(nextCatId++), name }
  mockCategories.push(cat)
  return { ...cat }
}

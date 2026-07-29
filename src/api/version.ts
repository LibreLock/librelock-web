import { apiRequest } from '@/services/api'

export interface ServerVersion {
  version: string
}

// Public endpoint: no session needed, so the About card also works on a locked/expired vault
export async function getServerVersion(): Promise<ServerVersion | null> {
  return (await apiRequest<ServerVersion>('/version')) ?? null
}

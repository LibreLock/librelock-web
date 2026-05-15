export type TabSyncUser = {
  id?: string | number
  username: string
  protected_key?: string
}

type TabSyncMessage =
  | { type: 'auth'; key: CryptoKey; user: TabSyncUser }
  | { type: 'logout' }
  | { type: 'request-key' }
  | { type: 'key-response'; key: CryptoKey; user: TabSyncUser }

const channel = new BroadcastChannel('librelock-auth')

export function broadcastAuth(key: CryptoKey, user: TabSyncUser): void {
  channel.postMessage({ type: 'auth', key, user: { ...user } })
}

export function broadcastLogout(): void {
  channel.postMessage({ type: 'logout' })
}

export function broadcastKeyResponse(key: CryptoKey, user: TabSyncUser): void {
  channel.postMessage({ type: 'key-response', key, user: { ...user } })
}

export function listenTabSync(handler: (msg: TabSyncMessage) => void): () => void {
  const listener = (e: MessageEvent<TabSyncMessage>) => handler(e.data)
  channel.addEventListener('message', listener)
  return () => channel.removeEventListener('message', listener)
}

export function requestKeyFromTabs(): Promise<{ key: CryptoKey; user: TabSyncUser } | null> {
  return new Promise((resolve) => {
    const off = listenTabSync((msg) => {
      if (msg.type === 'key-response') {
        clearTimeout(timer)
        off()
        resolve({ key: msg.key, user: msg.user })
      }
    })
    const timer = setTimeout(() => {
      off()
      resolve(null)
    }, 500)
    channel.postMessage({ type: 'request-key' })
  })
}

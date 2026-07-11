export type TabSyncUser = {
  id?: string | number
  username: string
  protected_key?: string
  public_key?: string
  encrypted_private_key?: string
}

// Keys shared alongside auth so a new tab unlocks the vault, sharing private key, and org key without re-deriving from the password
export type TabSyncKeys = {
  key: CryptoKey
  privateKey?: CryptoKey | null
  orgKey?: CryptoKey | null
}

type TabSyncMessage =
  | ({ type: 'auth'; user: TabSyncUser } & TabSyncKeys)
  | { type: 'logout' }
  | { type: 'request-key' }
  | ({ type: 'key-response'; user: TabSyncUser } & TabSyncKeys)

const channel = new BroadcastChannel('librelock-auth')

export function broadcastAuth(keys: TabSyncKeys, user: TabSyncUser): void {
  channel.postMessage({ type: 'auth', ...keys, user: { ...user } })
}

export function broadcastLogout(): void {
  channel.postMessage({ type: 'logout' })
}

export function broadcastKeyResponse(keys: TabSyncKeys, user: TabSyncUser): void {
  channel.postMessage({ type: 'key-response', ...keys, user: { ...user } })
}

export function listenTabSync(handler: (msg: TabSyncMessage) => void): () => void {
  const listener = (e: MessageEvent<TabSyncMessage>) => handler(e.data)
  channel.addEventListener('message', listener)
  return () => channel.removeEventListener('message', listener)
}

export function requestKeyFromTabs(): Promise<(TabSyncKeys & { user: TabSyncUser }) | null> {
  return new Promise((resolve) => {
    const off = listenTabSync((msg) => {
      if (msg.type === 'key-response') {
        clearTimeout(timer)
        off()
        resolve({ key: msg.key, privateKey: msg.privateKey, orgKey: msg.orgKey, user: msg.user })
      }
    })
    const timer = setTimeout(() => {
      off()
      resolve(null)
    }, 500)
    channel.postMessage({ type: 'request-key' })
  })
}

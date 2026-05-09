import { DB_NAME, KEY_ID, SESSION_FLAG, STORE } from '@/constants'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSessionKey(key: CryptoKey): Promise<void> {
  sessionStorage.setItem(SESSION_FLAG, '1')
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(key, KEY_ID)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function loadSessionKey(): Promise<CryptoKey | null> {
  if (!sessionStorage.getItem(SESSION_FLAG)) return null
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(KEY_ID)
    req.onsuccess = () => {
      db.close()
      resolve((req.result as CryptoKey) ?? null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function clearSessionKey(): Promise<void> {
  sessionStorage.removeItem(SESSION_FLAG)
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(KEY_ID)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

// Synchronous — safe to call in beforeunload
export function clearSessionFlag(): void {
  sessionStorage.removeItem(SESSION_FLAG)
}

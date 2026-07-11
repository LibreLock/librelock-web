import { DB_NAME, KEY_ID, ORG_KEY_ID, PRIVATE_KEY_ID, SESSION_FLAG, STORE } from '@/constants'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Stores a CryptoKey under an id
// Non-extractable keys structured-clone fine
function putKey(id: string, key: CryptoKey): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(key, id)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

function getKey(id: string): Promise<CryptoKey | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(id)
        req.onsuccess = () => {
          db.close()
          resolve((req.result as CryptoKey) ?? null)
        }
        req.onerror = () => {
          db.close()
          reject(req.error)
        }
      }),
  )
}

function deleteKeys(ids: string[]): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        for (const id of ids) tx.objectStore(STORE).delete(id)
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }),
  )
}

// The session flag (cleared on tab close) gates the lifetime of every stored key
export async function saveSessionKey(key: CryptoKey): Promise<void> {
  sessionStorage.setItem(SESSION_FLAG, '1')
  await putKey(KEY_ID, key)
}

export async function loadSessionKey(): Promise<CryptoKey | null> {
  if (!sessionStorage.getItem(SESSION_FLAG)) return null
  return getKey(KEY_ID)
}

export async function savePrivateKey(key: CryptoKey): Promise<void> {
  await putKey(PRIVATE_KEY_ID, key)
}

export async function loadPrivateKey(): Promise<CryptoKey | null> {
  if (!sessionStorage.getItem(SESSION_FLAG)) return null
  return getKey(PRIVATE_KEY_ID)
}

export async function saveOrgKey(key: CryptoKey): Promise<void> {
  await putKey(ORG_KEY_ID, key)
}

export async function loadOrgKey(): Promise<CryptoKey | null> {
  if (!sessionStorage.getItem(SESSION_FLAG)) return null
  return getKey(ORG_KEY_ID)
}

export async function clearSessionKey(): Promise<void> {
  sessionStorage.removeItem(SESSION_FLAG)
  await deleteKeys([KEY_ID, PRIVATE_KEY_ID, ORG_KEY_ID])
}

export function clearSessionFlag(): void {
  sessionStorage.removeItem(SESSION_FLAG)
}

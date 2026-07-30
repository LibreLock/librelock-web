import { DB_NAME, KEY_ID, ORG_KEY_ID, PRIVATE_KEY_ID, SESSION_SECRET, STORE } from '@/constants'

type WrappedKey = { iv: Uint8Array<ArrayBuffer>; data: ArrayBuffer }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function putRecord(id: string, record: WrappedKey): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(record, id)
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

function getRecord(id: string): Promise<WrappedKey | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly')
        const req = tx.objectStore(STORE).get(id)
        req.onsuccess = () => {
          db.close()
          resolve((req.result as WrappedKey) ?? null)
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

const ALL_IDS = [KEY_ID, PRIVATE_KEY_ID, ORG_KEY_ID]

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function readSessionSecret(): Uint8Array<ArrayBuffer> | null {
  const stored = sessionStorage.getItem(SESSION_SECRET)
  if (!stored) return null
  try {
    const bytes = base64ToBytes(stored)
    return bytes.length === 32 ? bytes : null
  } catch {
    return null
  }
}

function createSessionSecret(): Uint8Array<ArrayBuffer> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  sessionStorage.setItem(SESSION_SECRET, bytesToBase64(bytes))
  return bytes
}

function sessionKey(secret: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', secret, { name: 'AES-GCM', length: 256 }, false, [
    'wrapKey',
    'unwrapKey',
  ])
}

async function putWrapped(id: string, key: CryptoKey, format: 'raw' | 'pkcs8'): Promise<void> {
  // saveSessionKey is the only thing that creates the secret
  // Minting one here would re-key the store mid-session and orphan whatever was written under the old secret, so treat a missing one as "no session open" and write nothing
  const secret = readSessionSecret()
  if (!secret) return

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapper = await sessionKey(secret)
  const data = await crypto.subtle.wrapKey(format, key, wrapper, { name: 'AES-GCM', iv })
  await putRecord(id, { iv, data })
}

async function getWrapped(
  id: string,
  format: 'raw' | 'pkcs8',
  algorithm: AesKeyAlgorithm | RsaHashedImportParams,
  usages: KeyUsage[],
): Promise<CryptoKey | null> {
  const secret = readSessionSecret()
  if (!secret) {
    // No secret means the tab that wrote these rows is gone; whatever is left can never be read
    await deleteKeys(ALL_IDS)
    return null
  }

  const record = await getRecord(id)
  if (!record) return null

  try {
    return await crypto.subtle.unwrapKey(
      format,
      record.data,
      await sessionKey(secret),
      { name: 'AES-GCM', iv: record.iv },
      algorithm,
      true,
      usages,
    )
  } catch {
    // Wrapped under a different session secret, or a record from an older bundle
    return null
  }
}

const VAULT_KEY_ALGO: AesKeyAlgorithm = { name: 'AES-GCM', length: 256 }
const PRIVATE_KEY_ALGO: RsaHashedImportParams = { name: 'RSA-OAEP', hash: 'SHA-256' }

// The session secret is created here: saving the vault key is what opens a session
export async function saveSessionKey(key: CryptoKey): Promise<void> {
  if (!readSessionSecret()) createSessionSecret()
  await putWrapped(KEY_ID, key, 'raw')
}

export async function loadSessionKey(): Promise<CryptoKey | null> {
  return getWrapped(KEY_ID, 'raw', VAULT_KEY_ALGO, ['encrypt', 'decrypt'])
}

export async function savePrivateKey(key: CryptoKey): Promise<void> {
  await putWrapped(PRIVATE_KEY_ID, key, 'pkcs8')
}

export async function loadPrivateKey(): Promise<CryptoKey | null> {
  return getWrapped(PRIVATE_KEY_ID, 'pkcs8', PRIVATE_KEY_ALGO, ['decrypt'])
}

export async function saveOrgKey(key: CryptoKey): Promise<void> {
  await putWrapped(ORG_KEY_ID, key, 'raw')
}

export async function loadOrgKey(): Promise<CryptoKey | null> {
  return getWrapped(ORG_KEY_ID, 'raw', VAULT_KEY_ALGO, ['encrypt', 'decrypt'])
}

export async function clearSessionKey(): Promise<void> {
  sessionStorage.removeItem(SESSION_SECRET)
  await deleteKeys(ALL_IDS)
}

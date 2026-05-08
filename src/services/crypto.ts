import { argon2id } from 'hash-wasm'

const enc = new TextEncoder()
const dec = new TextDecoder()

export interface KdfParams {
  kdf_salt: string
  kdf_iter: number
  kdf_memory: number
  kdf_parallelism: number
}

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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateKdfSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(32)))
}

export async function deriveKeys(
  password: string,
  params: KdfParams,
): Promise<{ masterKey: CryptoKey; authCredential: string }> {
  const salt = base64ToBytes(params.kdf_salt)

  const masterKeyBytes = (await argon2id({
    password,
    salt,
    parallelism: params.kdf_parallelism,
    iterations: params.kdf_iter,
    memorySize: params.kdf_memory,
    hashLength: 32,
    outputType: 'binary',
  })) as Uint8Array<ArrayBuffer>

  // HKDF-SHA256(MasterKey, salt="auth") → AuthKey
  const hkdfMaterial = await crypto.subtle.importKey('raw', masterKeyBytes, 'HKDF', false, [
    'deriveBits',
  ])
  const authKeyBytes = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('auth'), info: new Uint8Array() },
    hkdfMaterial,
    256,
  )

  // auth_credential = SHA-256(AuthKey) hex
  const credHash = await crypto.subtle.digest('SHA-256', authKeyBytes)
  const authCredential = bytesToHex(new Uint8Array(credHash))

  const masterKey = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  return { masterKey, authCredential }
}

export async function encryptBlob(
  plaintext: object,
  masterKey: CryptoKey,
): Promise<{ encrypted_blob: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    enc.encode(JSON.stringify(plaintext)),
  )
  return {
    encrypted_blob: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  }
}

export async function decryptBlob(
  encrypted_blob: string,
  iv: string,
  masterKey: CryptoKey,
): Promise<unknown> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    masterKey,
    base64ToBytes(encrypted_blob),
  )
  return JSON.parse(dec.decode(plaintext))
}

// Encrypts a plain string — IV (12 bytes) is prepended to ciphertext and the
// whole thing is returned as a single base64 string.
export async function encryptField(value: string, masterKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    enc.encode(value),
  )
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)
  return bytesToBase64(combined)
}

export async function decryptField(encrypted: string, masterKey: CryptoKey): Promise<string> {
  const combined = base64ToBytes(encrypted)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    masterKey,
    ciphertext,
  )
  return dec.decode(plaintext)
}

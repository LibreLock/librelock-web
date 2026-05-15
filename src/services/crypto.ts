import { argon2id } from 'hash-wasm'

const enc = new TextEncoder()
const dec = new TextDecoder()

export interface KdfParams {
  kdfSalt: string
  kdfIter: number
  kdfMemory: number
  kdfParallelism: number
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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return bytes
}

export function generateKdfSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function deriveKeys(
  password: string,
  params: KdfParams,
): Promise<{ wrappingKey: CryptoKey; authCredential: string }> {
  const salt = hexToBytes(params.kdfSalt)

  const masterKeyBytes = (await argon2id({
    password,
    salt,
    parallelism: params.kdfParallelism,
    iterations: params.kdfIter,
    memorySize: params.kdfMemory,
    hashLength: 32,
    outputType: 'binary',
  })) as Uint8Array<ArrayBuffer>

  const hkdfKey = await crypto.subtle.importKey('raw', masterKeyBytes, 'HKDF', false, [
    'deriveBits',
  ])

  // HKDF(MasterKey, info="auth") -> auth_credential (hex)
  const authBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: enc.encode('auth') },
    hkdfKey,
    256,
  )
  const authCredential = bytesToHex(new Uint8Array(authBits))

  // HKDF(MasterKey, info="wrap") -> WrappingKey (AES-GCM)
  const wrapBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: enc.encode('wrap') },
    hkdfKey,
    256,
  )
  const wrappingKey = await crypto.subtle.importKey(
    'raw',
    wrapBits,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )

  return { wrappingKey, authCredential }
}

export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function wrapKey(vaultKey: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', vaultKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, rawKey)
  const combined = new Uint8Array(12 + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), 12)
  return bytesToBase64(combined)
}

export async function unwrapKey(protectedKey: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const combined = base64ToBytes(protectedKey)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const rawKey = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, ciphertext)
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptBlob(
  plaintext: object,
  key: CryptoKey,
): Promise<{ encrypted_blob: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
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
  key: CryptoKey,
): Promise<unknown> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(encrypted_blob),
  )
  return JSON.parse(dec.decode(plaintext))
}

// Encrypts a plain string - IV (12 bytes) is prepended to ciphertext and the whole thing is returned as a single base64 string
export async function encryptString(value: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(value))
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)
  return bytesToBase64(combined)
}

export async function decryptString(encrypted: string, key: CryptoKey): Promise<string> {
  const combined = base64ToBytes(encrypted)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return dec.decode(plaintext)
}

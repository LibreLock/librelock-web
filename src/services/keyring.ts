import { shallowRef } from 'vue'

let _vaultKey: CryptoKey | null = null
let _privateKey: CryptoKey | null = null

// Reactive so UI (the "share" toggle, shared-vault store) updates the moment access is gained/lost; access is granted mid-session by the bootstrap flow
const _orgKey = shallowRef<CryptoKey | null>(null)

export function getVaultKey(): CryptoKey | null {
  return _vaultKey
}

export function setVaultKey(key: CryptoKey | null): void {
  _vaultKey = key
}

// RSA private key for organization sharing (unwraps the org key)
export function getPrivateKey(): CryptoKey | null {
  return _privateKey
}

export function setPrivateKey(key: CryptoKey | null): void {
  _privateKey = key
}

// Shared organization AES key (present only for members with access)
export const orgKeyRef = _orgKey

export function getOrgKey(): CryptoKey | null {
  return _orgKey.value
}

export function setOrgKey(key: CryptoKey | null): void {
  _orgKey.value = key
}

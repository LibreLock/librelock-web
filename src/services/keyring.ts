let _vaultKey: CryptoKey | null = null

export function getVaultKey(): CryptoKey | null {
  return _vaultKey
}

export function setVaultKey(key: CryptoKey | null): void {
  _vaultKey = key
}

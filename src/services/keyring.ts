let _masterKey: CryptoKey | null = null

export function getMasterKey(): CryptoKey | null {
  return _masterKey
}

export function setMasterKey(key: CryptoKey | null): void {
  _masterKey = key
}

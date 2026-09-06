import { APP_NAME, BIOMETRIC_PREFIX } from '@/constants'
import {
  deleteDeviceRecord,
  getDeviceRecord,
  listDeviceRecords,
  putDeviceRecord,
} from '@/services/keystore'

// The credential is used as a PRF oracle, never as an authentication factor: nothing about the assertion is sent to or verified by the server.
// What it buys us is the platform's own user verification (fingerprint / face / device PIN) gating 32 deterministic bytes that exist nowhere else - not on disk, not in the account.
// Those bytes decrypt a locally stored copy of the MasterKey, which then drives the ordinary password login flow.
//
// Consequence worth being explicit about: the stored MasterKey is password-equivalent.
// Anyone who can satisfy this device's user verification can open the vault on this device.

const PRF_INFO = 'librelock-biometric-unlock-v1'

export interface BiometricRecord {
  username: string
  credentialId: ArrayBuffer
  prfSalt: Uint8Array<ArrayBuffer>
  iv: Uint8Array<ArrayBuffer>
  ciphertext: ArrayBuffer
  createdAt: string
}

/** The authenticator ran but does not implement the PRF extension, so there is no key to derive. */
export class PrfUnsupportedError extends Error {
  constructor(
    message = 'This device’s authenticator does not support the PRF extension that LibreLock needs.',
  ) {
    super(message)
    this.name = 'PrfUnsupportedError'
  }
}

/** The prompt was dismissed, timed out, or refused. Not an error worth shouting about. */
export class UserCancelledError extends Error {
  constructor(message = 'Fingerprint unlock was cancelled.') {
    super(message)
    this.name = 'UserCancelledError'
  }
}

/** Enrolled here, but the passkey is gone from the OS (deleted, or profile wiped). */
export class CredentialMissingError extends Error {
  constructor(
    message = 'The saved passkey is no longer on this device. Log in with your master password to set it up again.',
  ) {
    super(message)
    this.name = 'CredentialMissingError'
  }
}

function recordId(username: string): string {
  return `${BIOMETRIC_PREFIX}${username}`
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

// A WebAuthn call rejects with NotAllowedError both when the user dismisses the prompt and when
// the authenticator refuses; neither is worth surfacing as a failure
function asWebAuthnError(err: unknown): Error {
  if (
    err instanceof DOMException &&
    (err.name === 'NotAllowedError' || err.name === 'AbortError')
  ) {
    return new UserCancelledError()
  }
  return err instanceof Error ? err : new Error(String(err))
}

type PrfExtensionResults = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } }

/**
 * Whether this browser can even be offered the feature. PRF support itself cannot be probed
 * reliably everywhere - `getClientCapabilities` is recent - so a true here means "worth showing
 * the button"; enrollment is the authoritative check and throws PrfUnsupportedError if it is not.
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return false
  if (!window.isSecureContext) return false
  try {
    const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    if (!platform) return false
  } catch {
    return false
  }
  try {
    const caps = await (
      PublicKeyCredential as unknown as {
        getClientCapabilities?: () => Promise<Record<string, boolean | undefined>>
      }
    ).getClientCapabilities?.()
    // Only a definite false rules it out; older browsers report neither key and still support PRF
    if (caps && (caps['extension:prf'] === false || caps.prf === false)) return false
  } catch {
    /* capability probing is best effort */
  }
  return true
}

async function keyFromPrf(
  prfOutput: ArrayBuffer,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const hkdfKey = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode(PRF_INFO) },
    hkdfKey,
    256,
  )
  return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
}

async function evaluatePrf(
  credentialId: ArrayBuffer,
  prfSalt: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
  let assertion: PublicKeyCredential | null
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        // Never verified by anyone: this credential proves nothing, it only unwraps a local key
        challenge: randomBytes(32),
        allowCredentials: [{ id: credentialId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
        extensions: { prf: { eval: { first: prfSalt } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null
  } catch (err) {
    throw asWebAuthnError(err)
  }

  if (!assertion) throw new CredentialMissingError()

  const results = assertion.getClientExtensionResults() as PrfExtensionResults
  const first = results.prf?.results?.first
  if (!first) throw new PrfUnsupportedError()
  return first
}

/**
 * Creates a platform passkey and stores the MasterKey encrypted under its PRF output.
 * Needs the MasterKey, so callers must re-authenticate the user first.
 */
export async function enrollBiometric(
  username: string,
  masterKeyBytes: Uint8Array<ArrayBuffer>,
  rpName: string = APP_NAME,
): Promise<BiometricRecord> {
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { id: window.location.hostname, name: rpName },
        // Random rather than the account id: the server never sees this credential, so there is
        // nothing to correlate and no reason to write an account identifier into the authenticator
        user: { id: randomBytes(16), name: username, displayName: username },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
        extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null
  } catch (err) {
    throw asWebAuthnError(err)
  }

  if (!credential) throw new UserCancelledError()

  const created = credential.getClientExtensionResults() as PrfExtensionResults
  if (created.prf?.enabled === false) {
    throw new PrfUnsupportedError(
      'This device created a passkey but does not support the PRF extension LibreLock needs. Delete the new "' +
        rpName +
        '" passkey from your password manager - it is not used.',
    )
  }

  const prfSalt = randomBytes(32)
  // Most platforms return no PRF output from create(), only from a subsequent get(), so this
  // second prompt is not redundant - it is where the key material actually comes from
  const prfOutput = await evaluatePrf(credential.rawId, prfSalt)

  const iv = randomBytes(12)
  const key = await keyFromPrf(prfOutput, prfSalt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, masterKeyBytes)

  const record: BiometricRecord = {
    username,
    credentialId: credential.rawId,
    prfSalt,
    iv,
    ciphertext,
    createdAt: new Date().toISOString(),
  }
  await putDeviceRecord(recordId(username), record)
  return record
}

/** Recovers the MasterKey for an enrolled account. Throws if there is no enrollment. */
export async function unlockWithBiometric(username: string): Promise<Uint8Array<ArrayBuffer>> {
  const record = await getDeviceRecord<BiometricRecord>(recordId(username))
  if (!record) throw new CredentialMissingError()

  const prfOutput = await evaluatePrf(record.credentialId, record.prfSalt)
  const key = await keyFromPrf(prfOutput, record.prfSalt)

  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: record.iv },
      key,
      record.ciphertext,
    )
  } catch {
    // The authenticator answered but the bytes do not open the record: a different credential, or
    // a record written by an older format. Either way this enrollment is dead
    await removeBiometric(username)
    throw new CredentialMissingError()
  }
  return new Uint8Array(plaintext)
}

export function listBiometricRecords(): Promise<BiometricRecord[]> {
  return listDeviceRecords<BiometricRecord>(BIOMETRIC_PREFIX).catch(() => [])
}

export function getBiometricRecord(username: string): Promise<BiometricRecord | null> {
  return getDeviceRecord<BiometricRecord>(recordId(username)).catch(() => null)
}

export function removeBiometric(username: string): Promise<void> {
  return deleteDeviceRecord(recordId(username)).catch(() => undefined)
}

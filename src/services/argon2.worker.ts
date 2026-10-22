import { argon2id } from 'hash-wasm'

export interface Argon2Request {
  password: string
  salt: Uint8Array
  parallelism: number
  iterations: number
  memorySize: number
}

const worker = self as unknown as {
  onmessage: ((event: MessageEvent<Argon2Request>) => void) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}

// Argon2id is seconds of synchronous WASM; on the main thread it freezes the login spinner
worker.onmessage = async (event: MessageEvent<Argon2Request>) => {
  try {
    const hash = (await argon2id({
      ...event.data,
      hashLength: 32,
      outputType: 'binary',
    })) as Uint8Array<ArrayBuffer>
    worker.postMessage({ hash }, [hash.buffer])
  } catch (error) {
    worker.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}

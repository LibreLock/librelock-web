// QR decoding for 2FA setup codes. The native BarcodeDetector (Chrome / Android) is used when it
// exists; everywhere else (Safari, Firefox) jsQR is loaded on demand so it never weighs on startup.

type Source = ImageBitmap | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

interface NativeDetector {
  detect(source: Source): Promise<{ rawValue: string }[]>
}

declare const BarcodeDetector: (new (options: { formats: string[] }) => NativeDetector) | undefined

let nativeDetector: NativeDetector | null | undefined

function getNativeDetector(): NativeDetector | null {
  if (nativeDetector !== undefined) return nativeDetector
  try {
    nativeDetector =
      typeof BarcodeDetector === 'undefined' ? null : new BarcodeDetector({ formats: ['qr_code'] })
  } catch {
    nativeDetector = null
  }
  return nativeDetector
}

function sizeOf(source: Source): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight }
  }
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight }
  }
  return { width: source.width, height: source.height }
}

// Large screenshots are scaled down: jsQR is O(pixels) and a QR code stays readable at ~1000px
const MAX_SIDE = 1000

let scratch: HTMLCanvasElement | null = null

function toImageData(source: Source): ImageData | null {
  const { width, height } = sizeOf(source)
  if (!width || !height) return null

  const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  scratch ??= document.createElement('canvas')
  scratch.width = w
  scratch.height = h
  const ctx = scratch.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/** Returns the text of the first QR code found in the image/frame, or null. */
export async function decodeQr(source: Source): Promise<string | null> {
  const native = getNativeDetector()
  if (native) {
    try {
      const found = await native.detect(source)
      if (found[0]?.rawValue) return found[0].rawValue
    } catch {
      // fall through to the pure-JS decoder
    }
  }

  const data = toImageData(source)
  if (!data) return null
  const { default: jsQR } = await import('jsqr')
  return (
    jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' })?.data ?? null
  )
}

/** Decodes a QR code out of an image file (picked or pasted screenshot). */
export async function decodeQrFromFile(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  try {
    return await decodeQr(bitmap)
  } finally {
    bitmap.close()
  }
}

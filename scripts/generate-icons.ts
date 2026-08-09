/**
 * Regenerates the favicon / PWA / Apple icons in public/ from one vector source.
 *
 * Run with: npx tsx scripts/generate-icons.ts
 * Chromium comes from the Playwright install the e2e suite already needs (it rasterizes SVG far
 * better than ImageMagick's built-in renderer); favicon.ico packing needs `magick` on PATH.
 *
 * The maskable variants are full-bleed on purpose: Android crops them to its own shape, so an
 * icon carrying its own rounded corners ends up as a small square floating on a white plate.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const run = promisify(execFile)
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG = '#1a1c1e'
const FG = '#ffffff'
const LOCK =
  'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'

/**
 * @param radius corner radius in canvas units (0-50); 0 = full bleed
 * @param glyph  lock width in canvas units, i.e. percent of the icon
 */
function page({ radius, glyph }: { radius: number; glyph: number }) {
  const scale = glyph / 24
  const offset = 50 - glyph / 2
  return `<!doctype html>
<style>html,body{margin:0;padding:0}svg{display:block;width:100vw;height:100vh}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="0" y="0" width="100" height="100" rx="${radius}" fill="${BG}" />
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path fill="none" stroke="${FG}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="${LOCK}" />
  </g>
</svg>`
}

// Rounded square where the icon is shown as-is (browser tabs, desktop installs); full bleed
// wherever the platform applies its own mask (Android adaptive, iOS squircle).
const ROUNDED = page({ radius: 22, glyph: 50 })
const MASKABLE = page({ radius: 0, glyph: 44 })
const APPLE = page({ radius: 0, glyph: 52 })

const icons = [
  { file: 'pwa-192x192.png', size: 192, html: ROUNDED },
  { file: 'pwa-512x512.png', size: 512, html: ROUNDED },
  { file: 'pwa-maskable-192x192.png', size: 192, html: MASKABLE },
  { file: 'pwa-maskable-512x512.png', size: 512, html: MASKABLE },
  { file: 'apple-touch-icon.png', size: 180, html: APPLE },
]
const FAVICON_SIZES = [16, 32, 48]

const browser = await chromium.launch()
const scratch = await mkdtemp(join(tmpdir(), 'librelock-icons-'))

async function shot(html: string, size: number, out: string) {
  const tab = await browser.newPage({ viewport: { width: size, height: size } })
  await tab.setContent(html)
  await tab.screenshot({ path: out, omitBackground: true })
  await tab.close()
}

try {
  for (const { file, size, html } of icons) {
    await shot(html, size, join(PUBLIC_DIR, file))
    console.log(`wrote public/${file} (${size}x${size})`)
  }

  const frames: string[] = []
  for (const size of FAVICON_SIZES) {
    const out = join(scratch, `favicon-${size}.png`)
    await shot(ROUNDED, size, out)
    frames.push(out)
  }
  await run('magick', [...frames, join(PUBLIC_DIR, 'favicon.ico')])
  console.log(`wrote public/favicon.ico (${FAVICON_SIZES.join(', ')})`)
} finally {
  await browser.close()
  await rm(scratch, { recursive: true, force: true })
}

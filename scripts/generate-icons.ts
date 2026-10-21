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

// The app mark: a graphite tile lit from above with a padlock (Phosphor "Lock" on its 256
// grid). These are the dark-theme colours of components/icons/IconPadlock.vue, which is
// what every static copy (favicon, PWA icons, READMEs) uses. Keep the two in step.
const TOP = '#6e6e76'
const BOTTOM = '#26262a'
const FG = '#ffffff'
// Regular weight for the mark; the 16px favicon keeps the bold cut, since a thinner stroke turns to
// mush at that size
const LOCK =
  'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z'
const LOCK_BOLD =
  'M208,76H180V56A52,52,0,0,0,76,56V76H48A20,20,0,0,0,28,96V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V96A20,20,0,0,0,208,76ZM100,56a28,28,0,0,1,56,0V76H100ZM204,204H52V100H204Zm-60-52a16,16,0,1,1-16-16A16,16,0,0,1,144,152Z'

/**
 * @param radius corner radius in canvas units (0-50); 0 = full bleed
 * @param glyph  lock width in canvas units, i.e. percent of the icon
 */
export function markSvg({
  radius,
  glyph,
  bold = false,
}: {
  radius: number
  glyph: number
  bold?: boolean
}) {
  const scale = glyph / 256
  const offset = 50 - glyph / 2
  // The padlock's outline is centred at y=124 on its 256 grid, not 128: drop it to true centre
  const nudge = (4 / 256) * glyph
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${TOP}" />
      <stop offset="1" stop-color="${BOTTOM}" />
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="0.35" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="${radius}" fill="url(#fill)" />
  <rect x="0.5" y="0.5" width="99" height="99" rx="${Math.max(radius - 0.5, 0)}" fill="none" stroke="url(#edge)" />
  <path transform="translate(${offset} ${offset + nudge}) scale(${scale})" fill="${FG}" d="${bold ? LOCK_BOLD : LOCK}" />
</svg>`
}

function page(opts: { radius: number; glyph: number; bold?: boolean }) {
  return `<!doctype html>
<style>html,body{margin:0;padding:0}svg{display:block;width:100vw;height:100vh}</style>
${markSvg(opts)}`
}

// Rounded square where the icon is shown as-is (browser tabs, desktop installs); full bleed
// wherever the platform applies its own mask (Android adaptive, iOS squircle).
// Same corner as the in-app tile (rounded-[28%])
const LOGO = { radius: 28, glyph: 50 }
const ROUNDED = page(LOGO)
const MASKABLE = page({ radius: 0, glyph: 40 })
const APPLE = page({ radius: 0, glyph: 50 })
// A tab favicon renders at 16px, so it gets a much tighter crop or the padlock is a smudge
const FAVICON = page({ radius: 24, glyph: 74, bold: true })

const icons = [
  { file: 'pwa-192x192.png', size: 192, html: ROUNDED },
  { file: 'pwa-512x512.png', size: 512, html: ROUNDED },
  { file: 'pwa-maskable-192x192.png', size: 192, html: MASKABLE },
  { file: 'pwa-maskable-512x512.png', size: 512, html: MASKABLE },
  { file: 'apple-touch-icon.png', size: 180, html: APPLE },
  { file: 'logo.png', size: 1024, html: ROUNDED },
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
  // The vector original, also copied by hand to librelock-server/logo.svg and
  // librelock-readme/content/logo.svg for the READMEs
  await writeFile(join(PUBLIC_DIR, 'logo.svg'), markSvg(LOGO) + '\n')
  console.log('wrote public/logo.svg')

  for (const { file, size, html } of icons) {
    await shot(html, size, join(PUBLIC_DIR, file))
    console.log(`wrote public/${file} (${size}x${size})`)
  }

  const frames: string[] = []
  for (const size of FAVICON_SIZES) {
    const out = join(scratch, `favicon-${size}.png`)
    await shot(FAVICON, size, out)
    frames.push(out)
  }
  await run('magick', [...frames, join(PUBLIC_DIR, 'favicon.ico')])
  console.log(`wrote public/favicon.ico (${FAVICON_SIZES.join(', ')})`)
} finally {
  await browser.close()
  await rm(scratch, { recursive: true, force: true })
}

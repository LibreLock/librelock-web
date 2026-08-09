import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Keeps the app shell locked to the *visual* viewport.
 *
 * In an installed PWA the layout viewport (what `100dvh` measures) does not shrink when the
 * on-screen keyboard opens, so a flex-column shell ends up with its bottom nav underneath the
 * keyboard and — on iOS, which scrolls the layout viewport to reveal the focused input — its
 * topbar pushed off screen. Mirroring `visualViewport.height`/`offsetTop` into CSS variables
 * lets the shell resize and re-pin itself instead.
 */
export function useAppViewport() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null

  function sync() {
    const root = document.documentElement
    const height = vv?.height ?? window.innerHeight
    // Rounded down: a fractional height leaves a hairline of page scrollable on some browsers
    root.style.setProperty('--app-height', `${Math.floor(height)}px`)
    root.style.setProperty('--app-offset-top', `${Math.round(vv?.offsetTop ?? 0)}px`)
  }

  onMounted(() => {
    sync()
    if (vv) {
      vv.addEventListener('resize', sync)
      // iOS pans the visual viewport while the keyboard is up; offsetTop only changes on scroll
      vv.addEventListener('scroll', sync)
    }
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
  })

  onBeforeUnmount(() => {
    if (vv) {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
    window.removeEventListener('resize', sync)
    window.removeEventListener('orientationchange', sync)
  })
}

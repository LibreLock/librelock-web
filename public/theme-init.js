;(function () {
  var dark = localStorage.getItem('theme') !== 'light'
  if (dark) {
    document.documentElement.classList.add('dark')
  }
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', dark ? '#030712' : '#f9fafb')
  }

  // The boot shell in index.html spins on its own; if the app bundle never arrives (server or VPN
  // down, nothing useful in the service worker cache) nothing else on the page can explain it, so
  // this reveals the explanation. Vue removes #app-boot along with the rest of #app when it mounts.
  // Lives here rather than inline in index.html because the CSP has no 'unsafe-inline' for scripts.
  setTimeout(function () {
    var boot = document.getElementById('app-boot')
    if (boot) boot.classList.add('is-stalled')
  }, 8000)
})()

;(function () {
  var dark = localStorage.getItem('theme') !== 'light'
  if (dark) {
    document.documentElement.classList.add('dark')
  }
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', dark ? '#030712' : '#f9fafb')
  }
})()

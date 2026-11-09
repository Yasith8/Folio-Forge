(function () {
  try {
    var stored = localStorage.getItem('folioforge:color-scheme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    /* Storage can be unavailable (private mode); fall back to light. */
  }
})();

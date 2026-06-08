// Prevent flash of wrong theme
(function() {
  try {
    const saved = localStorage.getItem('swc-theme-preference') || 'system';
    const resolved = saved === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : saved;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    // localStorage not available on some file:// URIs
  }
})();

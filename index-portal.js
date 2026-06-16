// ── Portal Theme Switcher ───────────────────────
const themeSwitcher = document.getElementById('themeSwitcher');
const THEME_KEY = 'swc-theme-pref';

function getThemePref() {
  try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; }
}

function setThemePref(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function applyTheme(preference) {
  const resolved = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : preference;
  document.documentElement.setAttribute('data-theme', resolved);
}

function updateThemeIndicator(theme) {
  const indicator = document.getElementById('themeIndicator');
  if (!indicator || !themeSwitcher) return;
  let targetBtn = themeSwitcher.querySelector('[data-theme="' + theme + '"]');
  if (!targetBtn) targetBtn = themeSwitcher.querySelector('[data-theme="system"]');
  const r1 = themeSwitcher.getBoundingClientRect();
  const r2 = targetBtn.getBoundingClientRect();
  indicator.style.left = (r2.left - r1.left) + 'px';
  indicator.style.width = r2.width + 'px';
  indicator.style.height = r2.height + 'px';
  indicator.style.top = (r2.top - r1.top) + 'px';

  themeSwitcher.querySelectorAll('.theme-switcher__btn').forEach(function(btn) {
    btn.setAttribute('aria-checked', btn === targetBtn ? 'true' : 'false');
  });
}

if (themeSwitcher) {
  themeSwitcher.addEventListener('click', function(e) {
    var btn = e.target.closest('.theme-switcher__btn');
    if (!btn) return;
    var theme = btn.dataset.theme;
    setThemePref(theme);
    applyTheme(theme);
    updateThemeIndicator(theme);
  });
}

window.addEventListener('load', function() {
  updateThemeIndicator(getThemePref());
});

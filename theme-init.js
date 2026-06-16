// Prevent flash of wrong theme
// Framebuster for Clickjacking protection
if (window !== window.top) {
  try { window.top.location = window.location; } catch(e) {}
  // Fallback: if sandboxed iframe blocks navigation, hide all content
  document.documentElement.style.display = 'none';
}

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
(function() {
  const CONSENT_KEY = 'swc-storage-consent';

  function initConsent() {
    // If already consented, do nothing
    if (localStorage.getItem(CONSENT_KEY) === 'granted') {
      window.swcConsentGranted = true;
      return;
    }

    window.swcConsentGranted = false;

    // Create Banner
    const banner = document.createElement('div');
    banner.id = 'consentBanner';
    banner.style.position = 'fixed';
    banner.style.bottom = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.backgroundColor = 'var(--bg-card)';
    banner.style.borderTop = '1px solid var(--border-medium)';
    banner.style.padding = 'var(--space-md) var(--space-lg)';
    banner.style.display = 'flex';
    banner.style.justifyContent = 'space-between';
    banner.style.alignItems = 'center';
    banner.style.zIndex = '9999';
    banner.style.boxShadow = '0 -4px 12px rgba(0,0,0,0.1)';

    const text = document.createElement('p');
    text.style.margin = '0';
    text.style.fontSize = '0.9rem';
    text.style.color = 'var(--text-secondary)';
    text.innerHTML = 'We use local storage to temporarily save your inputs so you don\'t lose your progress. No data leaves your device. <a href="privacy.html" style="color: var(--accent); text-decoration: underline;">Learn more</a>.';

    const btnWrapper = document.createElement('div');
    btnWrapper.style.display = 'flex';
    btnWrapper.style.gap = '10px';

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'Accept & Continue';
    acceptBtn.style.padding = '8px 16px';
    acceptBtn.style.backgroundColor = 'var(--accent)';
    acceptBtn.style.color = 'var(--bg-main)';
    acceptBtn.style.border = 'none';
    acceptBtn.style.borderRadius = '4px';
    acceptBtn.style.fontWeight = '600';
    acceptBtn.style.cursor = 'pointer';

    acceptBtn.addEventListener('click', () => {
      localStorage.setItem(CONSENT_KEY, 'granted');
      window.swcConsentGranted = true;
      banner.style.display = 'none';
      // If there's a saveState globally available, trigger it now that we have consent
      if (typeof window.saveState === 'function') {
        window.saveState();
      }
    });

    btnWrapper.appendChild(acceptBtn);
    banner.appendChild(text);
    banner.appendChild(btnWrapper);

    document.body.appendChild(banner);
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsent);
  } else {
    initConsent();
  }
})();

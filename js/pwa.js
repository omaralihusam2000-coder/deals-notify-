/**
 * pwa.js — Progressive Web App management
 * Registers service worker and handles install prompt.
 * Features: slide-up banner from bottom, auto-dismiss after 15s, localStorage dismissal memory.
 */

const PWAModule = (() => {
  let deferredPrompt = null;
  let autoDismissTimer = null;
  const DISMISS_KEY = 'pwa_install_dismissed';
  const DISMISS_EXPIRY_DAYS = 7; // re-show after 7 days
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] Service worker registration failed:', err));
  }

  function isDismissed() {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const elapsed = Date.now() - parseInt(ts, 10);
    return elapsed < DISMISS_EXPIRY_DAYS * MS_PER_DAY;
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isDismissed()) {
        showInstallBanner();
      }
    });

    window.addEventListener('appinstalled', () => {
      hideInstallBanner();
      deferredPrompt = null;
      if (typeof showToast === 'function') showToast('🎮 App installed successfully!', 'success');
    });
  }

  function showInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('pwa-banner-visible'));
    });

    // Auto-dismiss after 15 seconds with fade-out
    clearTimeout(autoDismissTimer);
    autoDismissTimer = setTimeout(() => {
      dismissBanner(false);
    }, 15000);
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('pwa-banner-visible');
    banner.addEventListener('transitionend', () => { banner.style.display = 'none'; }, { once: true });
    clearTimeout(autoDismissTimer);
  }

  function dismissBanner(remember = true) {
    hideInstallBanner();
    if (remember) {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    clearTimeout(autoDismissTimer);
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallBanner();
    if (result.outcome === 'accepted') {
      if (typeof showToast === 'function') showToast('Installing app…', 'info');
    }
  }

  function init() {
    registerServiceWorker();
    setupInstallPrompt();

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', promptInstall);
    }

    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => dismissBanner(true));
    }
  }

  return { init, promptInstall, showInstallBanner, hideInstallBanner };
})();

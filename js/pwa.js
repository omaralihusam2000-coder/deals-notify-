/**
 * pwa.js — Progressive Web App management
 * Registers service worker and handles install prompt.
 */

const PWAModule = (() => {
  let deferredPrompt = null;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[PWA] Service worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] Service worker registration failed:', err));
  }

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
      hideInstallBanner();
      deferredPrompt = null;
      showToast('🎮 App installed successfully!', 'success');
    });
  }

  function showInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.display = 'flex';
      requestAnimationFrame(() => banner.classList.add('pwa-banner-visible'));
    }
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('pwa-banner-visible');
      banner.addEventListener('transitionend', () => { banner.style.display = 'none'; }, { once: true });
    }
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    deferredPrompt = null;
    hideInstallBanner();
    if (result.outcome === 'accepted') {
      showToast('Installing app…', 'info');
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
      dismissBtn.addEventListener('click', hideInstallBanner);
    }
  }

  return { init, promptInstall, showInstallBanner, hideInstallBanner };
})();

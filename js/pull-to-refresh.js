/**
 * pull-to-refresh.js — Native-feel pull-to-refresh for mobile
 */
const PullToRefreshModule = (() => {
  let startY = 0;
  let pulling = false;
  let indicator = null;
  const THRESHOLD = 80;

  function init() {
    // Only on touch devices
    if (!('ontouchstart' in window)) return;

    indicator = document.createElement('div');
    indicator.className = 'ptr-indicator';
    indicator.innerHTML = '<div class="ptr-spinner">🔄</div><span class="ptr-text">Pull to refresh</span>';
    document.body.prepend(indicator);

    let currentY = 0;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && diff < 150 && window.scrollY === 0) {
        const progress = Math.min(diff / THRESHOLD, 1);
        indicator.style.transform = `translateY(${Math.min(diff * 0.5, 60)}px)`;
        indicator.style.opacity = progress;
        indicator.classList.toggle('ptr-ready', diff >= THRESHOLD);
        if (diff >= THRESHOLD) {
          indicator.querySelector('.ptr-text').textContent = 'Release to refresh';
        } else {
          indicator.querySelector('.ptr-text').textContent = 'Pull to refresh';
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!pulling) return;
      const diff = (currentY || 0) - startY;
      pulling = false;
      currentY = 0;

      indicator.style.transform = 'translateY(-60px)';
      indicator.style.opacity = '0';
      indicator.classList.remove('ptr-ready');

      if (diff >= THRESHOLD && window.scrollY === 0) {
        triggerRefresh();
      }
    }, { passive: true });
  }

  function triggerRefresh() {
    if (typeof SoundsModule !== 'undefined') SoundsModule.click();
    showToast('🔄 Refreshing deals...', 'info');

    // Refresh current active tab
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
      const tabName = activeTab.dataset.tab;
      switch (tabName) {
        case 'deals':
          if (typeof DealsModule !== 'undefined') DealsModule.init();
          break;
        case 'giveaways':
          if (typeof GiveawaysModule !== 'undefined') GiveawaysModule.init();
          break;
        case 'news':
          if (typeof NewsModule !== 'undefined') NewsModule.fetchNews();
          break;
        case 'bundles':
          if (typeof BundlesModule !== 'undefined') BundlesModule.init();
          break;
        default:
          // Simulate tab re-click
          activeTab.click();
      }
    }
  }

  return { init };
})();

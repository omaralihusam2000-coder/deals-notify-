/**
 * app.js — Main application logic, tab navigation, and initialisation
 */

const AppModule = (() => {
  const TABS = ['deals', 'giveaways', 'wishlist', 'settings'];
  let activeTab = 'deals';

  /**
   * Switch to a tab by name
   * @param {string} tabName
   */
  function switchTab(tabName) {
    if (!TABS.includes(tabName)) return;

    // Update nav buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    activeTab = tabName;

    // Lazy-load tab content on first visit
    if (tabName === 'giveaways' && !document.getElementById('giveaways-grid').dataset.loaded) {
      document.getElementById('giveaways-grid').dataset.loaded = '1';
      GiveawaysModule.init();
    }

    if (tabName === 'wishlist') {
      WishlistModule.renderWishlist();
    }

    if (tabName === 'settings') {
      NotificationsModule.updateSettingsUI ? NotificationsModule.updateSettingsUI() : null;
    }
  }

  /**
   * Bind global navigation events
   */
  function bindNavEvents() {
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  /**
   * Initialise the entire application
   */
  async function init() {
    bindNavEvents();

    // Initialise modules
    WishlistModule.init();
    NotificationsModule.init();

    // Deals tab is default — initialise immediately
    await DealsModule.init();

    // Show a welcome notification badge if unseen
    updateNotifBadge();
  }

  /**
   * Show/hide notification permission badge in header
   */
  function updateNotifBadge() {
    const badge = document.getElementById('notif-status-badge');
    if (!badge) return;
    if (!('Notification' in window)) {
      badge.style.display = 'none';
      return;
    }
    const perm = Notification.permission;
    badge.style.display = perm === 'default' ? 'flex' : 'none';
    badge.title = 'Enable deal notifications';
    badge.addEventListener('click', async () => {
      const granted = await NotificationsModule.requestPermission();
      if (granted) {
        badge.style.display = 'none';
        showToast('Notifications enabled!', 'success');
      }
    });
  }

  return { init, switchTab };
})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AppModule.init().catch(err => {
    console.error('App init failed:', err);
    showToast('Application failed to initialise. Please refresh the page.', 'error');
  });
});

/**
 * notifications.js — Browser notification logic
 * Handles permission, thresholds, and periodic deal checks
 */

const NotificationsModule = (() => {
  const STORAGE_KEY = 'notification_prefs';
  const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
  let intervalId = null;
  let seenDealIds = new Set();

  /**
   * Default preferences
   */
  const DEFAULT_PREFS = {
    enabled: false,
    priceThreshold: 5,       // notify when price <= $5
    discountThreshold: 75,   // notify when discount >= 75%
    wishlistAlerts: true,
  };

  /**
   * Load preferences from localStorage
   * @returns {object}
   */
  function loadPrefs() {
    return { ...DEFAULT_PREFS, ...storageGet(STORAGE_KEY, {}) };
  }

  /**
   * Save preferences to localStorage
   * @param {object} prefs
   */
  function savePrefs(prefs) {
    storageSet(STORAGE_KEY, prefs);
  }

  /**
   * Request notification permission from the browser
   * @returns {Promise<boolean>}
   */
  async function requestPermission() {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported.', 'warning');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      showToast('Notification permission was denied. Please enable it in your browser settings.', 'warning');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Show a browser push notification
   * @param {string} title
   * @param {string} body
   * @param {string} icon
   * @param {string} url
   */
  function sendNotification(title, body, icon = '', url = '') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon: icon || 'https://www.cheapshark.com/img/logos/favicon.ico',
      badge: 'https://www.cheapshark.com/img/logos/favicon.ico',
    });
    if (url) {
      n.onclick = () => {
        window.open(url, '_blank');
        n.close();
      };
    }
  }

  /**
   * Check a list of deals against the user's thresholds
   * Sends notifications for new matching deals
   * @param {Array} deals
   */
  function checkDeals(deals) {
    const prefs = loadPrefs();
    if (!prefs.enabled || Notification.permission !== 'granted') return;

    deals.forEach(deal => {
      if (seenDealIds.has(deal.dealID)) return;

      const price = parseFloat(deal.salePrice);
      const savings = parseFloat(deal.savings);

      const matchesPrice = !isNaN(price) && price <= prefs.priceThreshold;
      const matchesDiscount = !isNaN(savings) && savings >= prefs.discountThreshold;

      if (matchesPrice || matchesDiscount) {
        seenDealIds.add(deal.dealID);
        sendNotification(
          `🔥 Deal Alert: ${deal.title}`,
          `${formatPrice(deal.salePrice)} (${formatSavings(deal.savings)} off) — was ${formatPrice(deal.normalPrice)}`,
          deal.thumb,
          `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}`
        );
      }
    });
  }

  /**
   * Start periodic deal checking
   */
  function startChecking() {
    stopChecking();
    intervalId = setInterval(async () => {
      const prefs = loadPrefs();
      if (!prefs.enabled) return;
      try {
        // Fetch latest deals for threshold checking
        const deals = await fetchJSON(
          `https://www.cheapshark.com/api/1.0/deals?pageSize=20&sortBy=DealRating&desc=1`
        );
        checkDeals(deals);

        // Also check wishlist
        if (prefs.wishlistAlerts && typeof WishlistModule !== 'undefined') {
          WishlistModule.checkDeals();
        }
      } catch (err) {
        console.warn('Background deal check failed:', err);
      }
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic checking
   */
  function stopChecking() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  /**
   * Update the Settings UI to reflect current prefs
   */
  function updateSettingsUI() {
    const prefs = loadPrefs();

    const toggle = document.getElementById('notif-toggle');
    const priceInput = document.getElementById('notif-price-threshold');
    const discountInput = document.getElementById('notif-discount-threshold');
    const wishlistToggle = document.getElementById('notif-wishlist-toggle');
    const statusBadge = document.getElementById('notif-permission-status');

    if (toggle) toggle.checked = prefs.enabled;
    if (priceInput) priceInput.value = prefs.priceThreshold;
    if (discountInput) discountInput.value = prefs.discountThreshold;
    if (wishlistToggle) wishlistToggle.checked = prefs.wishlistAlerts;

    if (statusBadge) {
      const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
      statusBadge.textContent = perm === 'granted' ? '✅ Granted' :
                                perm === 'denied'  ? '❌ Denied' :
                                perm === 'default' ? '⏳ Not set' :
                                '⚠️ Unsupported';
      statusBadge.className = `perm-badge perm-${perm}`;
    }
  }

  /**
   * Bind Settings page event listeners
   */
  function bindSettingsEvents() {
    const requestBtn = document.getElementById('request-notif-btn');
    if (requestBtn) {
      requestBtn.addEventListener('click', async () => {
        const granted = await requestPermission();
        if (granted) {
          showToast('Notifications enabled! You\'ll be alerted for great deals.', 'success');
          updateSettingsUI();
        }
      });
    }

    const toggle = document.getElementById('notif-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        const prefs = loadPrefs();
        prefs.enabled = toggle.checked;
        savePrefs(prefs);
        if (prefs.enabled) {
          startChecking();
          showToast('Deal notifications enabled!', 'success');
        } else {
          stopChecking();
          showToast('Deal notifications disabled.', 'info');
        }
      });
    }

    const saveBtn = document.getElementById('save-notif-prefs-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const prefs = loadPrefs();
        const priceInput = document.getElementById('notif-price-threshold');
        const discountInput = document.getElementById('notif-discount-threshold');
        const wishlistToggle = document.getElementById('notif-wishlist-toggle');

        if (priceInput)    prefs.priceThreshold    = parseFloat(priceInput.value) || DEFAULT_PREFS.priceThreshold;
        if (discountInput) prefs.discountThreshold = parseFloat(discountInput.value) || DEFAULT_PREFS.discountThreshold;
        if (wishlistToggle) prefs.wishlistAlerts   = wishlistToggle.checked;

        savePrefs(prefs);
        showToast('Notification preferences saved!', 'success');

        // Test notification
        if (prefs.enabled && Notification.permission === 'granted') {
          sendNotification(
            '🎮 Deal Notifier Active',
            `Alerting for deals under ${formatPrice(prefs.priceThreshold)} or ${prefs.discountThreshold}%+ off.`
          );
        }
      });
    }

    // Test notification button
    const testBtn = document.getElementById('test-notif-btn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        const granted = await requestPermission();
        if (granted) {
          sendNotification(
            '🎮 Test Notification',
            'Your gaming deal notifications are working correctly!',
            '',
            'https://www.cheapshark.com'
          );
          showToast('Test notification sent!', 'success');
        }
      });
    }
  }

  /**
   * Initialise the notifications module
   */
  function init() {
    updateSettingsUI();
    bindSettingsEvents();

    // If notifications were previously enabled, restart checking
    const prefs = loadPrefs();
    if (prefs.enabled && Notification.permission === 'granted') {
      startChecking();
    }
  }

  return { init, checkDeals, sendNotification, loadPrefs, startChecking, stopChecking, updateSettingsUI, requestPermission };
})();

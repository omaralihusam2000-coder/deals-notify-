/**
 * notifications.js — Browser notification logic
 * Handles permission, thresholds, and periodic deal checks
 */

const NotificationsModule = (() => {
  const STORAGE_KEY = 'notification_prefs';
  const HISTORY_KEY = 'notification_history';
  const CHECK_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
  let intervalId = null;
  let dailyIntervalId = null;
  let seenDealIds = new Set();

  /**
   * Default preferences
   */
  const DEFAULT_PREFS = {
    enabled: false,
    priceThreshold: 5,       // notify when price <= $5
    discountThreshold: 75,   // notify when discount >= 75%
    wishlistAlerts: true,
    // Enhanced scheduling prefs
    schedule: 'realtime',    // 'realtime' | 'daily' | 'weekly'
    dailyTime: '09:00',      // HH:MM for daily digest
    weeklyDay: '1',          // 0=Sun,1=Mon,...6=Sat
    flashSaleAlerts: true,   // 90%+ discount instant alerts
    freeGameAlerts: true,    // new free game alerts
    wishlistOnlyMode: false, // only notify for wishlisted games
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
   * Add a notification to the history log (last 20)
   */
  function addToHistory(title, body) {
    const history = storageGet(HISTORY_KEY, []);
    history.unshift({ title, body, ts: Date.now() });
    if (history.length > 20) history.length = 20;
    storageSet(HISTORY_KEY, history);
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
    addToHistory(title, body);
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

      // Wishlist-only mode
      if (prefs.wishlistOnlyMode) {
        const wishlisted = typeof WishlistModule !== 'undefined' && WishlistModule.isWishlisted(deal.gameID);
        if (!wishlisted) return;
      }

      // Flash sale alert (90%+ discount instant)
      if (prefs.flashSaleAlerts && savings >= 90) {
        seenDealIds.add(deal.dealID);
        sendNotification(
          `⚡ Flash Sale: ${deal.title}`,
          `${Math.round(savings)}% OFF — only ${formatPrice(deal.salePrice)}!`,
          deal.thumb,
          `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}`
        );
        return;
      }

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
   * Send a daily digest notification
   */
  async function sendDailyDigest() {
    const prefs = loadPrefs();
    if (!prefs.enabled || Notification.permission !== 'granted') return;
    try {
      const deals = await fetchJSON('https://www.cheapshark.com/api/1.0/deals?pageSize=5&sortBy=DealRating&desc=1');
      if (deals.length > 0) {
        const top = deals[0];
        sendNotification(
          '🎮 Daily Deal Digest',
          `Top deal today: ${top.title} — ${formatPrice(top.salePrice)} (${formatSavings(top.savings)} off)`,
          top.thumb,
          `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(top.dealID)}`
        );
      }
    } catch {
      // silently fail
    }
  }

  /**
   * Check if daily/weekly notification should fire now
   */
  function checkScheduledNotification() {
    const prefs = loadPrefs();
    if (!prefs.enabled) return;
    const now = new Date();

    if (prefs.schedule === 'daily') {
      const [h, m] = (prefs.dailyTime || '09:00').split(':').map(Number);
      if (now.getHours() === h && now.getMinutes() === m) {
        sendDailyDigest();
      }
    }
    if (prefs.schedule === 'weekly') {
      const targetDay = parseInt(prefs.weeklyDay) || 1;
      if (now.getDay() === targetDay && now.getHours() === 9 && now.getMinutes() === 0) {
        sendDailyDigest();
      }
    }
  }

  /**
   * Start periodic deal checking
   */
  function startChecking() {
    stopChecking();
    const prefs = loadPrefs();
    if (prefs.schedule === 'realtime') {
      intervalId = setInterval(async () => {
        const p = loadPrefs();
        if (!p.enabled) return;
        try {
          const deals = await fetchJSON(
            'https://www.cheapshark.com/api/1.0/deals?pageSize=20&sortBy=DealRating&desc=1'
          );
          checkDeals(deals);
          if (p.wishlistAlerts && typeof WishlistModule !== 'undefined') {
            WishlistModule.checkDeals();
          }
        } catch (err) {
          console.warn('Background deal check failed:', err);
        }
      }, CHECK_INTERVAL_MS);
    }
    // Always run the 1-minute scheduler check for daily/weekly triggers
    dailyIntervalId = setInterval(checkScheduledNotification, 60 * 1000);
  }

  /**
   * Stop periodic checking
   */
  function stopChecking() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (dailyIntervalId !== null) {
      clearInterval(dailyIntervalId);
      dailyIntervalId = null;
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

    // Render the advanced scheduling section
    renderSchedulingSettings(prefs);
    renderNotificationHistory();
  }

  /**
   * Render advanced scheduling settings card
   */
  function renderSchedulingSettings(prefs) {
    const container = document.getElementById('notif-schedule-section');
    if (!container) return;

    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">⏰ Deal Alert Schedule</h3>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Notification Schedule</strong>
            How often do you want deal alerts?
          </div>
          <select id="notif-schedule-select" class="filter-select">
            <option value="realtime" ${prefs.schedule === 'realtime' ? 'selected' : ''}>Real-time (every 5 min)</option>
            <option value="daily"    ${prefs.schedule === 'daily'    ? 'selected' : ''}>Daily Digest</option>
            <option value="weekly"   ${prefs.schedule === 'weekly'   ? 'selected' : ''}>Weekly Summary</option>
          </select>
        </div>

        <div class="settings-row" id="notif-daily-time-row" style="${prefs.schedule === 'daily' ? '' : 'display:none'}">
          <div class="settings-label"><strong>Daily Digest Time</strong></div>
          <input type="time" id="notif-daily-time" class="settings-input" value="${prefs.dailyTime || '09:00'}">
        </div>

        <div class="settings-row" id="notif-weekly-day-row" style="${prefs.schedule === 'weekly' ? '' : 'display:none'}">
          <div class="settings-label"><strong>Weekly Summary Day</strong></div>
          <select id="notif-weekly-day" class="filter-select">
            ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((d, i) =>
              `<option value="${i}" ${(prefs.weeklyDay || '1') == i ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>⚡ Flash Sale Alerts</strong>
            Instant alerts for 90%+ discounts.
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-flash-toggle" ${prefs.flashSaleAlerts ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>🆓 Free Game Alerts</strong>
            Notify when new free games appear.
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-free-toggle" ${prefs.freeGameAlerts ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>⭐ Wishlist-Only Mode</strong>
            Only notify for games on your wishlist.
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-wishlist-only-toggle" ${prefs.wishlistOnlyMode ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>
    `;

    const scheduleSelect = container.querySelector('#notif-schedule-select');
    if (scheduleSelect) {
      scheduleSelect.addEventListener('change', () => {
        const v = scheduleSelect.value;
        container.querySelector('#notif-daily-time-row').style.display = v === 'daily' ? '' : 'none';
        container.querySelector('#notif-weekly-day-row').style.display = v === 'weekly' ? '' : 'none';
      });
    }
  }

  /**
   * Render notification history
   */
  function renderNotificationHistory() {
    const container = document.getElementById('notif-history-section');
    if (!container) return;

    const history = storageGet(HISTORY_KEY, []);

    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">📋 Notification History (Last 20)</h3>
        ${history.length === 0
          ? '<p class="text-muted" style="padding:0.5rem 0;">No notifications sent yet.</p>'
          : `<div class="notif-history-list">
              ${history.map(h => `
                <div class="notif-history-item">
                  <div class="notif-history-title">${escapeHtml(h.title)}</div>
                  <div class="notif-history-body">${escapeHtml(h.body)}</div>
                  <div class="notif-history-time">${new Date(h.ts).toLocaleString()}</div>
                </div>
              `).join('')}
            </div>`
        }
        ${history.length > 0 ? '<button class="btn btn-ghost btn-sm" id="notif-clear-history-btn" style="margin-top:0.5rem;">🗑️ Clear History</button>' : ''}
      </div>
    `;

    const clearBtn = container.querySelector('#notif-clear-history-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        storageSet(HISTORY_KEY, []);
        showToast('Notification history cleared.', 'info');
        renderNotificationHistory();
      });
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
        const scheduleSelect = document.getElementById('notif-schedule-select');
        const dailyTimeInput = document.getElementById('notif-daily-time');
        const weeklyDaySelect = document.getElementById('notif-weekly-day');
        const flashToggle = document.getElementById('notif-flash-toggle');
        const freeToggle = document.getElementById('notif-free-toggle');
        const wishlistOnlyToggle = document.getElementById('notif-wishlist-only-toggle');

        if (priceInput)    prefs.priceThreshold    = parseFloat(priceInput.value) || DEFAULT_PREFS.priceThreshold;
        if (discountInput) prefs.discountThreshold = parseFloat(discountInput.value) || DEFAULT_PREFS.discountThreshold;
        if (wishlistToggle) prefs.wishlistAlerts   = wishlistToggle.checked;
        if (scheduleSelect) prefs.schedule         = scheduleSelect.value;
        if (dailyTimeInput) prefs.dailyTime        = dailyTimeInput.value;
        if (weeklyDaySelect) prefs.weeklyDay       = weeklyDaySelect.value;
        if (flashToggle) prefs.flashSaleAlerts     = flashToggle.checked;
        if (freeToggle) prefs.freeGameAlerts       = freeToggle.checked;
        if (wishlistOnlyToggle) prefs.wishlistOnlyMode = wishlistOnlyToggle.checked;

        savePrefs(prefs);
        showToast('Notification preferences saved!', 'success');

        // Restart checking with new schedule
        if (prefs.enabled && Notification.permission === 'granted') {
          startChecking();
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

  return { init, checkDeals, sendNotification, loadPrefs, startChecking, stopChecking, updateSettingsUI, requestPermission, renderNotificationHistory };
})();

/**
 * price-scheduler.js — "Notify Me When" Price Alert Scheduler
 * Set target price alerts on deals. Background checks on deal fetches.
 * Triggers browser notification + toast when price hits target.
 * Alerts managed in Settings tab.
 */

const PriceSchedulerModule = (() => {
  const ALERTS_KEY = 'price_alerts';

  function getAlerts() {
    try { return JSON.parse(localStorage.getItem(ALERTS_KEY)) || []; }
    catch { return []; }
  }

  function saveAlerts(alerts) {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }

  function addAlert({ dealID, title, thumb, targetPrice, currentPrice, dateStart, dateEnd }) {
    const alerts = getAlerts();
    // Update if same deal
    const idx = alerts.findIndex(a => a.dealID === dealID);
    const alert = { dealID, title, thumb, targetPrice: parseFloat(targetPrice), currentPrice: parseFloat(currentPrice), dateStart: dateStart || null, dateEnd: dateEnd || null, createdAt: Date.now(), triggered: false };
    if (idx >= 0) alerts[idx] = alert;
    else alerts.push(alert);
    saveAlerts(alerts);
    showToast(`🔔 Alert set for "${title}" at $${parseFloat(targetPrice).toFixed(2)}`, 'success');
    renderAlertsInSettings();
  }

  function removeAlert(dealID) {
    saveAlerts(getAlerts().filter(a => a.dealID !== dealID));
    renderAlertsInSettings();
    showToast('🔕 Price alert removed', 'info');
  }

  function checkAlerts(currentDeals) {
    const alerts = getAlerts();
    let changed = false;

    alerts.forEach(alert => {
      if (alert.triggered) return;
      const deal = currentDeals.find(d => d.dealID === alert.dealID);
      if (!deal) return;

      const price = parseFloat(deal.salePrice || deal.cheapest || 0);
      if (price <= alert.targetPrice) {
        alert.triggered = true;
        changed = true;
        triggerAlert(alert, price);
      }
    });

    if (changed) saveAlerts(alerts);
  }

  function triggerAlert(alert, actualPrice) {
    const msg = `🔔 "${alert.title}" is now $${actualPrice.toFixed(2)} (target: $${alert.targetPrice.toFixed(2)})!`;
    showToast(msg, 'success');

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎮 Price Alert Triggered!', {
        body: msg,
        icon: alert.thumb || 'icons/icon-192.png',
      });
    }

    if (typeof SoundsModule !== 'undefined') SoundsModule.success?.();
  }

  // ── Alert Form Modal ─────────────────────────────────────────────
  function showAlertForm(deal) {
    document.getElementById('ps-alert-overlay')?.remove();

    const currentPrice = parseFloat(deal.salePrice || deal.cheapest || 0);
    const overlay = document.createElement('div');
    overlay.id = 'ps-alert-overlay';
    overlay.className = 'ps-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Set price alert');

    overlay.innerHTML = `
      <div class="ps-modal">
        <div class="ps-modal-header">
          <h3>🔔 Set Price Alert</h3>
          <button class="ps-close" aria-label="Close">✕</button>
        </div>
        <div class="ps-preview">
          ${deal.thumb ? `<img src="${escapeHtml(deal.thumb)}" alt="" class="ps-thumb" loading="lazy">` : ''}
          <div>
            <div class="ps-deal-title">${escapeHtml(deal.title || '')}</div>
            <div class="ps-current-price">Current: <strong>$${currentPrice.toFixed(2)}</strong></div>
          </div>
        </div>
        <div class="ps-form">
          <div class="ps-form-group">
            <label class="ps-label" for="ps-target-price">Target Price ($)</label>
            <input type="number" id="ps-target-price" class="settings-input"
                   value="${(currentPrice * 0.8).toFixed(2)}"
                   step="0.01" min="0" max="${currentPrice}"
                   aria-label="Target price">
          </div>
          <div class="ps-form-row">
            <div class="ps-form-group">
              <label class="ps-label" for="ps-date-start">From (optional)</label>
              <input type="date" id="ps-date-start" class="settings-input" aria-label="Start date">
            </div>
            <div class="ps-form-group">
              <label class="ps-label" for="ps-date-end">To (optional)</label>
              <input type="date" id="ps-date-end" class="settings-input" aria-label="End date">
            </div>
          </div>
          <button class="btn btn-primary" id="ps-save-btn">🔔 Set Alert</button>
        </div>
      </div>
    `;

    overlay.querySelector('.ps-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#ps-save-btn').addEventListener('click', () => {
      const targetPrice = parseFloat(overlay.querySelector('#ps-target-price').value);
      if (isNaN(targetPrice) || targetPrice < 0) {
        showToast('Please enter a valid target price', 'error');
        return;
      }
      addAlert({
        dealID: deal.dealID,
        title: deal.title || '',
        thumb: deal.thumb || '',
        targetPrice,
        currentPrice,
        dateStart: overlay.querySelector('#ps-date-start').value || null,
        dateEnd: overlay.querySelector('#ps-date-end').value || null,
      });
      overlay.remove();
    });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('ps-overlay--visible'));
    setTimeout(() => overlay.querySelector('#ps-target-price')?.focus(), 50);
  }

  // ── Settings Render ───────────────────────────────────────────────
  function renderAlertsInSettings() {
    const container = document.getElementById('price-alerts-settings');
    if (!container) return;

    const alerts = getAlerts();

    container.innerHTML = `
      <div class="settings-card">
        <h3 class="settings-card-title">🔔 Price Alerts (${alerts.filter(a => !a.triggered).length} active)</h3>
        ${!alerts.length ? '<p class="ps-settings-empty">No price alerts set. Click "🔔 Set Price Alert" on any deal card.</p>' : `
          <div class="ps-alerts-list">
            ${alerts.map(alert => `
              <div class="ps-alert-item${alert.triggered ? ' ps-alert--triggered' : ''}">
                ${alert.thumb ? `<img src="${escapeHtml(alert.thumb)}" alt="" class="ps-alert-thumb" loading="lazy">` : ''}
                <div class="ps-alert-info">
                  <div class="ps-alert-title">${escapeHtml(truncate(alert.title, 40))}</div>
                  <div class="ps-alert-target">
                    Target: <strong>$${alert.targetPrice.toFixed(2)}</strong>
                    ${alert.triggered ? '<span class="ps-badge-triggered">✅ Triggered!</span>' : ''}
                  </div>
                  ${alert.dateEnd ? `<div class="ps-alert-date">Until: ${alert.dateEnd}</div>` : ''}
                </div>
                <button class="btn btn-ghost btn-xs ps-remove-btn" data-id="${escapeHtml(alert.dealID)}" aria-label="Remove alert">✕</button>
              </div>
            `).join('')}
          </div>
          <div style="text-align:right;margin-top:0.5rem;">
            <button class="btn btn-ghost btn-sm" id="ps-clear-triggered-btn">🗑️ Clear Triggered</button>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('.ps-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeAlert(btn.dataset.id));
    });
    container.querySelector('#ps-clear-triggered-btn')?.addEventListener('click', () => {
      saveAlerts(getAlerts().filter(a => !a.triggered));
      renderAlertsInSettings();
    });
  }

  function createAlertButton(deal) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-xs btn-price-alert';
    btn.innerHTML = '🔔 Alert';
    btn.setAttribute('aria-label', `Set price alert for ${deal.title || 'this deal'}`);
    const hasAlert = getAlerts().some(a => a.dealID === deal.dealID);
    if (hasAlert) {
      btn.innerHTML = '🔔 Alert ✓';
      btn.classList.add('btn-price-alert--active');
    }
    btn.addEventListener('click', (e) => { e.stopPropagation(); showAlertForm(deal); });
    return btn;
  }

  function init() {
    renderAlertsInSettings();
  }

  return { init, addAlert, removeAlert, checkAlerts, showAlertForm, createAlertButton, getAlerts };
})();

document.addEventListener('DOMContentLoaded', () => PriceSchedulerModule.init());

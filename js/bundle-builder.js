/**
 * bundle-builder.js — Smart Bundle Builder
 * Floating "Build Bundle" button. Users add games to a virtual cart.
 * Shows total price, savings vs buying individually, and a summary.
 */

const BundleBuilderModule = (() => {
  let bundleItems = [];
  let panelOpen   = false;

  function getTotal()    { return bundleItems.reduce((sum, i) => sum + parseFloat(i.salePrice || 0), 0); }
  function getOrigTotal(){ return bundleItems.reduce((sum, i) => sum + parseFloat(i.normalPrice || i.salePrice || 0), 0); }

  function savingsPercent() {
    const orig = getOrigTotal();
    const sale = getTotal();
    if (!orig) return 0;
    return Math.round(((orig - sale) / orig) * 100);
  }

  function addItem(deal) {
    if (bundleItems.find(i => i.dealID === deal.dealID)) {
      showToast('Already in bundle!', 'info');
      return;
    }
    bundleItems.push(deal);
    updatePanel();
    updateFAB();
    showToast(`➕ Added "${deal.title}" to bundle`, 'success');
  }

  function removeItem(dealID) {
    bundleItems = bundleItems.filter(i => i.dealID !== dealID);
    updatePanel();
    updateFAB();
  }

  function updateFAB() {
    const fab = document.getElementById('bundle-fab');
    if (!fab) return;
    const count = bundleItems.length;
    fab.querySelector('.bb-fab-count').textContent = count || '';
    fab.querySelector('.bb-fab-count').style.display = count ? 'inline-flex' : 'none';
  }

  function updatePanel() {
    const panel = document.getElementById('bundle-panel');
    if (!panel) return;

    const total    = getTotal();
    const origTotal = getOrigTotal();
    const savings  = (origTotal - total).toFixed(2);

    const listEl = panel.querySelector('#bb-items-list');
    const summaryEl = panel.querySelector('#bb-summary');

    if (!listEl || !summaryEl) return;

    if (!bundleItems.length) {
      listEl.innerHTML = '<p class="bb-empty">Add deals from the main feed to build your bundle.</p>';
      summaryEl.style.display = 'none';
      return;
    }

    summaryEl.style.display = '';

    listEl.innerHTML = bundleItems.map(item => `
      <div class="bb-item" data-id="${escapeHtml(item.dealID)}">
        ${item.thumb ? `<img src="${escapeHtml(item.thumb)}" alt="" class="bb-thumb" loading="lazy">` : '<span class="bb-thumb-ph">🎮</span>'}
        <div class="bb-item-info">
          <div class="bb-item-title">${escapeHtml(truncate(item.title || '', 32))}</div>
          <div class="bb-item-price">
            ${item.normalPrice && parseFloat(item.normalPrice) > parseFloat(item.salePrice || 0)
              ? `<s class="bb-orig-price">$${parseFloat(item.normalPrice).toFixed(2)}</s>` : ''}
            <span class="bb-sale-price">$${parseFloat(item.salePrice || 0).toFixed(2)}</span>
          </div>
        </div>
        <button class="bb-remove-btn" data-id="${escapeHtml(item.dealID)}" aria-label="Remove from bundle">✕</button>
      </div>
    `).join('');

    summaryEl.innerHTML = `
      <div class="bb-summary-row">
        <span>Original Total:</span>
        <span><s>$${origTotal.toFixed(2)}</s></span>
      </div>
      <div class="bb-summary-row bb-summary-total">
        <span>Bundle Total:</span>
        <span style="color:var(--accent-green);">$${total.toFixed(2)}</span>
      </div>
      ${parseFloat(savings) > 0 ? `
        <div class="bb-summary-savings">
          💰 You save <strong>$${savings}</strong> (${savingsPercent()}% off vs. original)
        </div>
      ` : ''}
      <div class="bb-summary-actions">
        <button class="btn btn-ghost btn-sm" id="bb-clear-btn">🗑️ Clear</button>
        <button class="btn btn-primary btn-sm" id="bb-shop-btn">🛒 Shop Each Deal</button>
      </div>
    `;

    // Event bindings
    listEl.querySelectorAll('.bb-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeItem(btn.dataset.id));
    });
    panel.querySelector('#bb-clear-btn')?.addEventListener('click', () => {
      bundleItems = [];
      updatePanel();
      updateFAB();
    });
    panel.querySelector('#bb-shop-btn')?.addEventListener('click', () => {
      bundleItems.forEach(item => {
        window.open(`https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(item.dealID)}`, '_blank', 'noopener,noreferrer');
      });
    });
  }

  function openPanel() {
    const panel = document.getElementById('bundle-panel');
    if (!panel) return;
    panelOpen = true;
    panel.classList.add('bb-panel--open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('bundle-panel-overlay')?.classList.add('bb-panel-overlay--visible');
    updatePanel();
  }

  function closePanel() {
    const panel = document.getElementById('bundle-panel');
    if (!panel) return;
    panelOpen = false;
    panel.classList.remove('bb-panel--open');
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('bundle-panel-overlay')?.classList.remove('bb-panel-overlay--visible');
  }

  function createAddButton(deal) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-xs btn-add-bundle';
    btn.innerHTML = '🛒 Bundle';
    btn.setAttribute('aria-label', `Add ${deal.title || 'deal'} to bundle`);
    btn.addEventListener('click', (e) => { e.stopPropagation(); addItem(deal); });
    return btn;
  }

  function init() {
    // FAB button
    const fab = document.getElementById('bundle-fab');
    if (fab) {
      fab.addEventListener('click', () => panelOpen ? closePanel() : openPanel());
    }

    // Panel close button
    document.getElementById('bundle-panel-close')?.addEventListener('click', closePanel);

    // Overlay click to close
    document.getElementById('bundle-panel-overlay')?.addEventListener('click', closePanel);

    // Keyboard: Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panelOpen) closePanel();
    });

    updateFAB();
  }

  return { init, addItem, removeItem, createAddButton, getItems: () => bundleItems };
})();

document.addEventListener('DOMContentLoaded', () => BundleBuilderModule.init());

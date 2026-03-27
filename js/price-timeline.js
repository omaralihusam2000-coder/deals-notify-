/**
 * price-timeline.js — Price Drop Timeline
 * Live feed of recent price drops as a horizontal scrollable timeline.
 * Auto-refreshes every 5 minutes. Clicking an item opens that deal.
 */

const PriceTimelineModule = (() => {
  const REFRESH_MS = 5 * 60 * 1000;
  let refreshTimer = null;
  let isLoading = false;

  async function fetchRecentDrops() {
    try {
      const url = 'https://www.cheapshark.com/api/1.0/deals?sortBy=Recent&pageSize=15&upperPrice=60';
      const data = await fetchJSON(url);
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

  function timeAgo(timestamp) {
    const ts = typeof timestamp === 'number' && timestamp < 1e12
      ? timestamp * 1000 : parseInt(timestamp, 10);
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (isNaN(diff) || diff < 0) return 'just now';
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function render(deals) {
    const container = document.getElementById('price-timeline-container');
    if (!container) return;

    if (!deals.length) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';
    container.innerHTML = `
      <div class="ptl-header">
        <h3 class="ptl-title">🔥 Recent Price Drops</h3>
        <button class="btn btn-ghost btn-xs" id="ptl-refresh-btn" aria-label="Refresh price drops">🔄 Refresh</button>
      </div>
      <div class="ptl-track" role="list" aria-label="Recent price drops">
        ${deals.map(deal => {
          const title       = deal.title || '';
          const salePrice   = parseFloat(deal.salePrice || 0);
          const normalPrice = parseFloat(deal.normalPrice || 0);
          const savings     = Math.round(parseFloat(deal.savings || 0));
          const thumb       = deal.thumb || '';
          const lastChange  = deal.lastChange;
          const dealID      = deal.dealID;

          return `
            <div class="ptl-item" role="listitem" tabindex="0"
                 data-deal-id="${escapeHtml(dealID)}"
                 title="${escapeHtml(title)}"
                 aria-label="${escapeHtml(title)} — ${savings}% off">
              ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="ptl-thumb" loading="lazy">` : '<span class="ptl-thumb-ph">🎮</span>'}
              <div class="ptl-info">
                <div class="ptl-item-title">${escapeHtml(truncate(title, 28))}</div>
                <div class="ptl-prices">
                  <span class="ptl-old">$${normalPrice.toFixed(2)}</span>
                  <span class="ptl-arrow">→</span>
                  <span class="ptl-new">$${salePrice.toFixed(2)}</span>
                </div>
                <div class="ptl-meta">
                  <span class="ptl-badge">-${savings}%</span>
                  <span class="ptl-time">${timeAgo(lastChange)}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Click handler — scroll to deal card or open its link
    container.querySelectorAll('.ptl-item').forEach(item => {
      const handleActivate = () => {
        const dealID = item.dataset.dealId;
        // Try to find card in deals grid
        const card = document.querySelector(`[data-deal-id="${dealID}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('deal-card--highlighted');
          setTimeout(() => card.classList.remove('deal-card--highlighted'), 2500);
        } else {
          // Switch to deals tab, open redirect
          document.querySelector('[data-tab="deals"]')?.click();
          window.open(`https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(dealID)}`, '_blank', 'noopener,noreferrer');
        }
      };
      item.addEventListener('click', handleActivate);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handleActivate(); });
    });

    document.getElementById('ptl-refresh-btn')?.addEventListener('click', () => load());
  }

  async function load() {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById('price-timeline-container');
    if (container) {
      container.style.display = '';
      container.innerHTML = `
        <div class="ptl-header"><h3 class="ptl-title">🔥 Recent Price Drops</h3></div>
        <div class="ptl-loading"><span class="ptl-spinner"></span> Loading latest price drops…</div>
      `;
    }

    const deals = await fetchRecentDrops();
    render(deals);
    isLoading = false;
  }

  function startAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(load, REFRESH_MS);
  }

  function init() {
    const container = document.getElementById('price-timeline-container');
    if (!container) return;
    load();
    startAutoRefresh();
  }

  return { init, load };
})();

document.addEventListener('DOMContentLoaded', () => PriceTimelineModule.init());

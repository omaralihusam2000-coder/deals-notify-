/**
 * game-detail.js — Rich Game Detail Modal
 * Shows price comparison, chart, trailer, ratings, wishlist, share
 */

const GameDetailModule = (() => {
  const MODAL_ID = 'game-detail-modal';

  function open(deal) {
    const existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();

    const savings = Math.round(parseFloat(deal.savings) || 0);
    const salePrice = parseFloat(deal.salePrice || 0);
    const normalPrice = parseFloat(deal.normalPrice || 0);
    const isWishlisted = typeof WishlistModule !== 'undefined' && WishlistModule.isWishlisted(deal.gameID);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay game-detail-overlay';
    overlay.id = MODAL_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', deal.title);

    overlay.innerHTML = `
      <div class="modal-box game-detail-box">
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(deal.title)}</h2>
          <button class="modal-close" aria-label="${typeof t === 'function' ? t('close') : 'Close'}">✕</button>
        </div>
        <div class="modal-body game-detail-body">

          <!-- Hero -->
          <div class="gd-hero">
            <img class="gd-hero-img" src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22460%22 height=%22215%22><rect fill=%22%231a1a2e%22 width=%22460%22 height=%22215%22/><text fill=%22%2300d4ff%22 font-size=%2248%22 x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22>🎮</text></svg>'">
            <div class="gd-hero-info">
              <div class="gd-badges-row">
                ${deal.metacriticScore && parseInt(deal.metacriticScore) > 0
                  ? `<span class="metacritic-badge ${parseInt(deal.metacriticScore) >= 75 ? 'metacritic-green' : parseInt(deal.metacriticScore) >= 50 ? 'metacritic-yellow' : 'metacritic-red'}" title="Metacritic Score">MC: ${deal.metacriticScore}</span>`
                  : ''}
                ${deal.steamRatingPercent && parseInt(deal.steamRatingPercent) > 0
                  ? `<span class="steam-rating-badge" title="Steam Rating">🟢 ${deal.steamRatingPercent}%</span>`
                  : ''}
                ${savings > 0 ? `<span class="badge badge-red">-${savings}%</span>` : ''}
              </div>
              <div class="gd-price-row">
                <span class="price-sale gd-sale-price">$${salePrice.toFixed(2)}</span>
                ${normalPrice > 0 ? `<span class="price-original">$${normalPrice.toFixed(2)}</span>` : ''}
              </div>
              <div class="gd-actions">
                <a class="btn btn-primary" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}" target="_blank" rel="noopener noreferrer">
                  🔥 ${typeof t === 'function' ? t('get_deal') : 'Get Deal'}
                </a>
                <button class="btn btn-outline btn-sm gd-wishlist-btn ${isWishlisted ? 'active' : ''}"
                        data-game-id="${escapeHtml(deal.gameID)}"
                        data-game-title="${escapeHtml(deal.title)}">
                  ${isWishlisted ? '★ Wishlisted' : '☆ Wishlist'}
                </button>
                <button class="btn btn-ghost btn-sm gd-share-btn">📤 Share</button>
              </div>
            </div>
          </div>

          <!-- Tabs inside modal -->
          <div class="gd-tabs">
            <button class="gd-tab active" data-gd-tab="prices">🏪 Price Comparison</button>
            <button class="gd-tab" data-gd-tab="chart">📊 Price History</button>
            <button class="gd-tab" data-gd-tab="trailer">🎬 Trailer</button>
          </div>

          <div id="gd-panel-prices" class="gd-panel active">
            <div class="modal-loading"><div class="spinner"></div><p>Loading prices…</p></div>
          </div>
          <div id="gd-panel-chart" class="gd-panel" style="display:none;">
            <div class="modal-loading"><div class="spinner"></div><p>Loading chart…</p></div>
          </div>
          <div id="gd-panel-trailer" class="gd-panel" style="display:none;">
            <div class="modal-loading"><div class="spinner"></div><p>Loading trailer…</p></div>
          </div>

        </div>
      </div>
    `;

    // Close events
    overlay.querySelector('.modal-close').addEventListener('click', () => close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    }, { once: true });

    // Wishlist button
    overlay.querySelector('.gd-wishlist-btn').addEventListener('click', () => {
      if (typeof WishlistModule !== 'undefined') {
        WishlistModule.toggle(deal.gameID, deal.title, deal.thumb, deal.salePrice);
        const btn = overlay.querySelector('.gd-wishlist-btn');
        const isNow = WishlistModule.isWishlisted(deal.gameID);
        btn.classList.toggle('active', isNow);
        btn.textContent = isNow ? '★ Wishlisted' : '☆ Wishlist';
      }
    });

    // Share button
    overlay.querySelector('.gd-share-btn').addEventListener('click', () => {
      if (typeof ShareModule !== 'undefined') ShareModule.shareDeal(deal);
    });

    // Tab switching inside modal
    overlay.querySelectorAll('.gd-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.gd-tab').forEach(t => t.classList.remove('active'));
        overlay.querySelectorAll('.gd-panel').forEach(p => p.style.display = 'none');
        tab.classList.add('active');
        const panel = document.getElementById(`gd-panel-${tab.dataset.gdTab}`);
        if (panel) panel.style.display = 'block';

        if (tab.dataset.gdTab === 'prices' && !tab.dataset.loaded) {
          tab.dataset.loaded = '1';
          loadPrices(deal.gameID);
        }
        if (tab.dataset.gdTab === 'chart' && !tab.dataset.loaded) {
          tab.dataset.loaded = '1';
          loadChart(deal.gameID, deal.title);
        }
        if (tab.dataset.gdTab === 'trailer' && !tab.dataset.loaded) {
          tab.dataset.loaded = '1';
          loadTrailer(deal.title);
        }
      });
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    // Load prices immediately (first tab)
    loadPrices(deal.gameID);
  }

  async function loadPrices(gameID) {
    const panel = document.getElementById('gd-panel-prices');
    if (!panel) return;
    try {
      const data = await fetchJSON(`https://www.cheapshark.com/api/1.0/games?id=${encodeURIComponent(gameID)}`);
      const deals = data.deals || [];
      const cheapestEver = data.cheapestPriceEver;

      if (deals.length === 0) {
        panel.innerHTML = '<div class="empty-state"><p>No price data available.</p></div>';
        return;
      }

      let cheapestEverHTML = '';
      if (cheapestEver) {
        cheapestEverHTML = `
          <div class="gd-cheapest-ever">
            <span class="gd-cheapest-label">💎 All-Time Low:</span>
            <span class="price-sale">$${parseFloat(cheapestEver.price).toFixed(2)}</span>
            <span class="gd-cheapest-date">${cheapestEver.date ? new Date(cheapestEver.date * 1000).toLocaleDateString() : ''}</span>
          </div>`;
      }

      const rows = deals.map(d => `
        <div class="gd-price-row-item">
          <span class="gd-store-name">${escapeHtml(d.storeName || `Store ${d.storeID}`)}</span>
          <span class="gd-store-price price-sale">$${parseFloat(d.price).toFixed(2)}</span>
          <a class="btn btn-primary btn-sm" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID)}" target="_blank" rel="noopener noreferrer">Buy</a>
        </div>
      `).join('');

      panel.innerHTML = `
        ${cheapestEverHTML}
        <div class="gd-prices-list">${rows}</div>
      `;
    } catch (err) {
      panel.innerHTML = `<p class="text-error">Failed to load prices: ${escapeHtml(err.message)}</p>`;
    }
  }

  function loadChart(gameID, gameTitle) {
    const panel = document.getElementById('gd-panel-chart');
    if (!panel) return;
    if (typeof ChartsModule !== 'undefined') {
      panel.innerHTML = '<canvas id="gd-chart-canvas" height="200"></canvas>';
      ChartsModule.renderInlineChart('gd-chart-canvas', gameID, gameTitle);
    } else {
      panel.innerHTML = '<p class="text-muted">Chart module not loaded.</p>';
    }
  }

  function loadTrailer(gameTitle) {
    const panel = document.getElementById('gd-panel-trailer');
    if (!panel) return;
    const query = encodeURIComponent(`${gameTitle} official trailer gameplay`);
    panel.innerHTML = `
      <div class="gd-trailer-wrap">
        <div class="gd-trailer-placeholder">
          <p class="text-muted">🎬 Search for <strong>${escapeHtml(gameTitle)}</strong> trailer:</p>
          <a class="btn btn-outline" href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noopener noreferrer">
            ▶️ Watch on YouTube
          </a>
        </div>
      </div>
    `;
  }

  function close() {
    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;
    overlay.classList.remove('modal-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  return { open, close };
})();

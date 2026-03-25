/**
 * charts.js — Price History Charts & Price Comparison Modal using Chart.js
 */

const ChartsModule = (() => {
  let priceChart = null;
  let compareChart = null;

  function createModalBase(id, title) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(title)}</h2>
          <button class="modal-close" aria-label="Close modal">✕</button>
        </div>
        <div class="modal-body" id="${id}-body">
          <div class="modal-loading">
            <div class="spinner"></div>
            <p>Loading data…</p>
          </div>
        </div>
      </div>
    `;

    overlay.querySelector('.modal-close').addEventListener('click', () => closeModal(id));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(id); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { closeModal(id); document.removeEventListener('keydown', escHandler); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));
    return overlay;
  }

  function closeModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('modal-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    if (id === 'chart-modal' && priceChart) { priceChart.destroy(); priceChart = null; }
    if (id === 'compare-modal' && compareChart) { compareChart.destroy(); compareChart = null; }
  }

  async function showPriceHistory(gameID, gameTitle) {
    const overlay = createModalBase('chart-modal', `📊 Price History — ${gameTitle}`);
    const body = document.getElementById('chart-modal-body');

    try {
      const data = await fetchJSON(`https://www.cheapshark.com/api/1.0/games?id=${encodeURIComponent(gameID)}`);
      const deals = data.deals || [];

      if (deals.length === 0) {
        body.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>No price history available for this game.</p></div>`;
        return;
      }

      const prices = deals.map(d => parseFloat(d.price));
      const lowest = Math.min(...prices);
      const average = prices.reduce((a, b) => a + b, 0) / prices.length;
      const cheapestDeal = deals.reduce((a, b) => parseFloat(a.price) < parseFloat(b.price) ? a : b);
      const currentLowest = parseFloat(cheapestDeal.price);

      body.innerHTML = `
        <div class="chart-stats">
          <div class="chart-stat">
            <span class="chart-stat-label">All-Time Low</span>
            <span class="chart-stat-value accent-green">$${lowest.toFixed(2)}</span>
          </div>
          <div class="chart-stat">
            <span class="chart-stat-label">Average Price</span>
            <span class="chart-stat-value accent-blue">$${average.toFixed(2)}</span>
          </div>
          <div class="chart-stat">
            <span class="chart-stat-label">Current Best</span>
            <span class="chart-stat-value accent-orange">$${currentLowest.toFixed(2)}</span>
          </div>
          <div class="chart-stat">
            <span class="chart-stat-label">Stores Tracked</span>
            <span class="chart-stat-value">${deals.length}</span>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="price-history-canvas"></canvas>
        </div>
        <div class="chart-deals-list">
          <h3 class="chart-section-title">All Available Deals</h3>
          <div class="chart-deals-grid" id="chart-deals-grid"></div>
        </div>
      `;

      // Sort deals by price
      const sortedDeals = [...deals].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      const dealsGrid = document.getElementById('chart-deals-grid');
      sortedDeals.forEach(d => {
        const item = document.createElement('a');
        item.className = 'chart-deal-item';
        item.href = `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID)}`;
        item.target = '_blank';
        item.rel = 'noopener noreferrer';
        item.innerHTML = `
          <span class="chart-deal-store">${escapeHtml(DealsModule.getStoreName(d.storeID))}</span>
          <span class="chart-deal-price">$${parseFloat(d.price).toFixed(2)}</span>
          ${d.retailPrice && parseFloat(d.retailPrice) > parseFloat(d.price)
            ? `<span class="chart-deal-savings">-${Math.round((1 - parseFloat(d.price) / parseFloat(d.retailPrice)) * 100)}%</span>`
            : ''}
        `;
        dealsGrid.appendChild(item);
      });

      // Render chart after DOM is updated
      requestAnimationFrame(() => {
        const canvas = document.getElementById('price-history-canvas');
        if (!canvas || typeof Chart === 'undefined') return;
        const ctx = canvas.getContext('2d');
        const storeNames = sortedDeals.map(d => DealsModule.getStoreName(d.storeID));
        const storePrices = sortedDeals.map(d => parseFloat(d.price));
        const barColors = storePrices.map(p =>
          p === lowest ? 'rgba(0,255,136,0.8)' :
          p < average  ? 'rgba(0,212,255,0.7)' :
                         'rgba(168,85,247,0.6)'
        );
        priceChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: storeNames,
            datasets: [{
              label: 'Price (USD)',
              data: storePrices,
              backgroundColor: barColors,
              borderColor: barColors.map(c => c.replace('0.8', '1').replace('0.7', '1').replace('0.6', '1')),
              borderWidth: 1,
              borderRadius: 6,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => ` $${ctx.parsed.y.toFixed(2)}`
                }
              }
            },
            scales: {
              x: { ticks: { color: '#a0a0b0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: {
                beginAtZero: true,
                ticks: { color: '#a0a0b0', callback: v => `$${v}` },
                grid: { color: 'rgba(255,255,255,0.05)' }
              }
            }
          }
        });
      });
    } catch (err) {
      body.innerHTML = `<div class="error-state"><div class="error-icon">⚠️</div><p>Failed to load price history: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  async function showPriceComparison(gameID, gameTitle) {
    const overlay = createModalBase('compare-modal', `🆚 Price Comparison — ${gameTitle}`);
    const body = document.getElementById('compare-modal-body');

    try {
      const data = await fetchJSON(`https://www.cheapshark.com/api/1.0/games?id=${encodeURIComponent(gameID)}`);
      const deals = (data.deals || []).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      if (deals.length === 0) {
        body.innerHTML = `<div class="empty-state"><div class="empty-icon">🆚</div><p>No comparison data available.</p></div>`;
        return;
      }

      const lowestPrice = parseFloat(deals[0].price);

      body.innerHTML = `
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Sale Price</th>
                <th>Regular Price</th>
                <th>Savings</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="compare-tbody"></tbody>
          </table>
        </div>
        <div class="chart-container" style="margin-top:1.5rem;">
          <canvas id="compare-canvas"></canvas>
        </div>
      `;

      const tbody = document.getElementById('compare-tbody');
      deals.forEach(d => {
        const price = parseFloat(d.price);
        const retail = parseFloat(d.retailPrice) || 0;
        const savings = retail > price ? Math.round((1 - price / retail) * 100) : 0;
        const isBest = price === lowestPrice;
        const tr = document.createElement('tr');
        if (isBest) tr.classList.add('compare-best-row');
        tr.innerHTML = `
          <td>${escapeHtml(DealsModule.getStoreName(d.storeID))} ${isBest ? '<span class="badge badge-green">Best</span>' : ''}</td>
          <td class="${isBest ? 'accent-green' : ''}">$${price.toFixed(2)}</td>
          <td class="text-muted">${retail > 0 ? `$${retail.toFixed(2)}` : '—'}</td>
          <td>${savings > 0 ? `<span class="badge badge-orange">-${savings}%</span>` : '—'}</td>
          <td><a class="btn btn-sm btn-primary" href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID)}" target="_blank" rel="noopener noreferrer">Buy</a></td>
        `;
        tbody.appendChild(tr);
      });

      requestAnimationFrame(() => {
        const canvas = document.getElementById('compare-canvas');
        if (!canvas || typeof Chart === 'undefined') return;
        const ctx = canvas.getContext('2d');
        compareChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: deals.map(d => DealsModule.getStoreName(d.storeID)),
            datasets: [
              {
                label: 'Sale Price',
                data: deals.map(d => parseFloat(d.price)),
                backgroundColor: 'rgba(0,212,255,0.7)',
                borderRadius: 4,
              },
              {
                label: 'Regular Price',
                data: deals.map(d => parseFloat(d.retailPrice) || 0),
                backgroundColor: 'rgba(168,85,247,0.4)',
                borderRadius: 4,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#a0a0b0' } },
              tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toFixed(2)}` } }
            },
            scales: {
              x: { ticks: { color: '#a0a0b0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#a0a0b0', callback: v => `$${v}` }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }
        });
      });
    } catch (err) {
      body.innerHTML = `<div class="error-state"><div class="error-icon">⚠️</div><p>Failed to load comparison: ${escapeHtml(err.message)}</p></div>`;
    }
  }

  function showTrailerModal(gameTitle) {
    const query = encodeURIComponent(`${gameTitle} game trailer`);
    const overlay = createModalBase('trailer-modal', `🎬 ${gameTitle} — Trailer`);
    const body = document.getElementById('trailer-modal-body');
    body.innerHTML = `
      <div class="trailer-search-notice">
        <p>🎬 Watch the trailer for <strong>${escapeHtml(gameTitle)}</strong> on YouTube:</p>
        <a class="btn btn-primary"
           href="https://www.youtube.com/results?search_query=${query}"
           target="_blank" rel="noopener noreferrer">
          ▶ Open YouTube Search
        </a>
        <div class="trailer-embed-wrap">
          <iframe
            width="560" height="315"
            src="https://www.youtube-nocookie.com/embed?listType=search&list=${query}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            title="${escapeHtml(gameTitle)} trailer">
          </iframe>
        </div>
      </div>
    `;
  }

  return { showPriceHistory, showPriceComparison, showTrailerModal };
})();

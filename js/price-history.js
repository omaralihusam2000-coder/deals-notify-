/**
 * price-history.js — Price History Graph Modal
 * Shows a Chart.js line graph with price history for any game deal.
 * Uses CheapShark API game lookup endpoint.
 */

const PriceHistoryModule = (() => {
  let chartInstance = null;

  // ── Fetch price history ──────────────────────────────────────────
  async function fetchHistory(gameID) {
    try {
      const url = `https://www.cheapshark.com/api/1.0/games?id=${encodeURIComponent(gameID)}`;
      return await fetchJSON(url);
    } catch (e) {
      console.warn('PriceHistory: fetch failed', e);
      return null;
    }
  }

  // ── Show Modal ───────────────────────────────────────────────────
  async function showModal(dealID, title, thumb) {
    removeModal();

    const overlay = document.createElement('div');
    overlay.id = 'ph-overlay';
    overlay.className = 'ph-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `Price history for ${title}`);
    overlay.innerHTML = `
      <div class="ph-modal">
        <div class="ph-header">
          ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" class="ph-thumb" loading="lazy">` : ''}
          <div class="ph-title-wrap">
            <h3 class="ph-title">${escapeHtml(title)}</h3>
            <p class="ph-subtitle">📊 Price History</p>
          </div>
          <button class="ph-close" aria-label="Close">✕</button>
        </div>
        <div class="ph-loading">
          <div class="ph-spinner"></div>
          <p>Loading price history…</p>
        </div>
        <div class="ph-chart-wrap" style="display:none;">
          <canvas id="ph-chart" height="200"></canvas>
        </div>
        <div class="ph-stats" style="display:none;"></div>
      </div>
    `;

    overlay.querySelector('.ph-close').addEventListener('click', removeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) removeModal(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { removeModal(); document.removeEventListener('keydown', onKey); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('ph-overlay--visible'));

    // Resolve gameID from dealID if needed
    let gameData = null;
    try {
      // First try via deal redirect to get gameID
      const dealRes = await fetchJSON(`https://www.cheapshark.com/api/1.0/deals?dealID=${encodeURIComponent(dealID)}&limit=1`);
      const gid = Array.isArray(dealRes) && dealRes[0]?.gameID;
      if (gid) gameData = await fetchHistory(gid);
      else gameData = await fetchHistory(dealID);
    } catch { gameData = await fetchHistory(dealID); }

    renderChart(overlay, gameData, title);
  }

  function removeModal() {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    document.getElementById('ph-overlay')?.remove();
  }

  function renderChart(overlay, data, title) {
    const loadingEl = overlay.querySelector('.ph-loading');
    const chartWrap = overlay.querySelector('.ph-chart-wrap');
    const statsEl = overlay.querySelector('.ph-stats');

    if (!data || !data.deals) {
      loadingEl.innerHTML = '<p class="ph-error">⚠️ Price history not available for this game.</p>';
      return;
    }

    loadingEl.style.display = 'none';
    chartWrap.style.display = '';
    statsEl.style.display = '';

    const deals = data.deals.slice(0, 30).reverse();
    const labels = deals.map((d, i) => {
      const date = new Date(d.lastChange * 1000);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const prices = deals.map(d => parseFloat(d.price));
    const currentPrice = parseFloat(data.info?.cheapest || prices[prices.length - 1] || 0);
    const lowestPrice = Math.min(...prices, currentPrice);
    const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : 'N/A';

    const lowestIdx = prices.indexOf(lowestPrice);

    const ctx = overlay.querySelector('#ph-chart').getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Price (USD)',
          data: prices,
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0,212,255,0.08)',
          tension: 0.35,
          fill: true,
          pointBackgroundColor: prices.map((p, i) =>
            i === lowestIdx ? '#00ff88' : (i === prices.length - 1 ? '#ffd700' : '#00d4ff')),
          pointRadius: prices.map((p, i) => (i === lowestIdx || i === prices.length - 1) ? 7 : 3),
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` $${ctx.parsed.y.toFixed(2)}${ctx.dataIndex === lowestIdx ? ' 🏆 All-Time Low!' : ''}`,
            },
          },
        },
        scales: {
          x: { ticks: { color: '#a0a0b0', maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#a0a0b0', callback: v => `$${v.toFixed(2)}` }, grid: { color: 'rgba(255,255,255,0.05)' } },
        },
      },
    });

    statsEl.innerHTML = `
      <div class="ph-stat-item">
        <span class="ph-stat-label">💰 Current</span>
        <span class="ph-stat-value ph-current">$${currentPrice.toFixed(2)}</span>
      </div>
      <div class="ph-stat-item">
        <span class="ph-stat-label">🏆 All-Time Low</span>
        <span class="ph-stat-value ph-low">$${lowestPrice.toFixed(2)}</span>
      </div>
      <div class="ph-stat-item">
        <span class="ph-stat-label">📊 Avg Price</span>
        <span class="ph-stat-value">$${avgPrice}</span>
      </div>
      <div class="ph-stat-item">
        <span class="ph-stat-label">📈 Stores</span>
        <span class="ph-stat-value">${data.deals.length} offers</span>
      </div>
    `;
  }

  // ── Create "Price History" button ─────────────────────────────────
  function createButton(dealID, title, thumb) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-xs btn-price-history';
    btn.innerHTML = '📊 Price History';
    btn.setAttribute('aria-label', `View price history for ${title}`);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof GamificationModule !== 'undefined') GamificationModule.recordEvent('view');
      showModal(dealID, title, thumb);
    });
    return btn;
  }

  return { showModal, createButton };
})();

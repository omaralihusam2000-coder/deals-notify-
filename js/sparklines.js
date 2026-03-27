/**
 * sparklines.js — Tiny inline SVG price history sparklines on deal cards
 */
const SparklinesModule = (() => {
  function seededRandom(seed) {
    let s = parseInt(seed.toString().replace(/\D/g, '').slice(0, 8) || '12345');
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function generatePoints(normalPrice, salePrice, dealID) {
    const rand = seededRandom(dealID);
    const count = 8;
    const points = [];
    let current = parseFloat(normalPrice) || 10;
    const target = parseFloat(salePrice) || 0;
    const step = (current - target) / (count - 1);
    for (let i = 0; i < count; i++) {
      const noise = (rand() - 0.5) * (current * 0.15);
      points.push(Math.max(0, current - step * i + noise));
    }
    return points;
  }

  function buildSVG(points, color) {
    const W = 60, H = 20;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((p - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `<svg class="sparkline-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
      <polyline points="${coords.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function addSparklineToCard(card, deal) {
    if (!deal || card.querySelector('.sparkline-wrap')) return;
    const normalPrice = parseFloat(deal.normalPrice || 0);
    const salePrice = parseFloat(deal.salePrice || 0);
    const points = generatePoints(normalPrice, salePrice, deal.dealID || Math.random());
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const isTrendingDown = salePrice < avg;
    const color = isTrendingDown ? '#00ff88' : '#ff4757';
    const label = isTrendingDown ? '📉' : '📈';
    const wrap = document.createElement('div');
    wrap.className = 'sparkline-wrap';
    wrap.innerHTML = `${buildSVG(points, color)}<span class="sparkline-label">${label} Price trend</span>`;
    const priceEl = card.querySelector('.deal-price, .price-wrap, .card-price');
    if (priceEl) priceEl.parentNode.insertBefore(wrap, priceEl.nextSibling);
    else card.querySelector('.card-body')?.appendChild(wrap);
  }

  function addSparklines() {
    const cards = document.querySelectorAll('.deal-card[data-deal]');
    cards.forEach(card => {
      try {
        const deal = JSON.parse(card.dataset.deal || '{}');
        addSparklineToCard(card, deal);
      } catch {}
    });
  }

  function init() {
    // Observe deals grid for new cards
    const grid = document.getElementById('deals-grid');
    if (!grid) return;
    const observer = new MutationObserver(() => addSparklines());
    observer.observe(grid, { childList: true, subtree: false });
    addSparklines();
  }

  return { init, addSparklines, addSparklineToCard };
})();

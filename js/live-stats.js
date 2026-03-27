/**
 * live-stats.js — Animated stats bar showing live deal metrics
 */
const LiveStatsModule = (() => {
  function init() {
    const container = document.getElementById('live-stats-bar');
    if (!container) return;

    fetch('https://www.cheapshark.com/api/1.0/deals?pageSize=60&sortBy=DealRating&desc=1')
      .then(r => r.json())
      .then(deals => {
        if (!deals || deals.length === 0) return;

        const totalDeals = deals.length;
        const avgDiscount = Math.round(deals.reduce((sum, d) => sum + parseFloat(d.savings || 0), 0) / totalDeals);
        const freeGames = deals.filter(d => parseFloat(d.salePrice) === 0).length;
        const bestDeal = deals.reduce((a, b) => parseFloat(b.savings) > parseFloat(a.savings) ? b : a, deals[0]);
        const bestDiscount = Math.round(parseFloat(bestDeal.savings));

        container.innerHTML = `
          <div class="stat-item">
            <span class="stat-icon">🔥</span>
            <span class="stat-value" data-target="${totalDeals}">0</span>
            <span class="stat-label">Active Deals</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-icon">💰</span>
            <span class="stat-value" data-target="${avgDiscount}" data-suffix="%">0%</span>
            <span class="stat-label">Avg Discount</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-icon">🏆</span>
            <span class="stat-value" data-target="${bestDiscount}" data-suffix="%">0%</span>
            <span class="stat-label">Best Deal</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-icon">🆓</span>
            <span class="stat-value" data-target="${freeGames}">0</span>
            <span class="stat-label">Free Games</span>
          </div>
        `;

        container.style.display = 'flex';
        animateCounters(container);
      })
      .catch((err) => { console.warn('[LiveStats] Failed to load deal stats:', err); });
  }

  function animateCounters(container) {
    const counters = container.querySelectorAll('.stat-value[data-target]');
    counters.forEach(counter => {
      const target = parseInt(counter.dataset.target);
      const suffix = counter.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);
        counter.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }

  return { init };
})();

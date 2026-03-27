/**
 * mini-stats.js — Compact stats bar shown above the deals grid
 */
const MiniStatsModule = (() => {
  function init() {
    const bar = document.getElementById('mini-stats-bar');
    if (!bar) return;
    render(bar);
  }

  function render(bar) {
    if (typeof GamificationModule === 'undefined') {
      bar.style.display = 'none';
      return;
    }

    const stats = GamificationModule.getStats();
    const badgeCount = (storageGet('gamification_badges', [])).length;
    const savings = GamificationModule.getSavings();

    bar.innerHTML = `
      <div class="mini-stat" data-tooltip="Total deals you've viewed">
        <span class="mini-stat-icon">👀</span>
        <span class="mini-stat-value">${stats.views || 0}</span>
        <span class="mini-stat-label">viewed</span>
      </div>
      <div class="mini-stat" data-tooltip="Total money saved from deals">
        <span class="mini-stat-icon">💰</span>
        <span class="mini-stat-value">$${(savings || 0).toFixed(0)}</span>
        <span class="mini-stat-label">saved</span>
      </div>
      <div class="mini-stat" data-tooltip="Games in your wishlist">
        <span class="mini-stat-icon">⭐</span>
        <span class="mini-stat-value">${stats.wishlistAdds || 0}</span>
        <span class="mini-stat-label">wishlisted</span>
      </div>
      <div class="mini-stat" data-tooltip="Badges earned from achievements">
        <span class="mini-stat-icon">🏅</span>
        <span class="mini-stat-value">${badgeCount}</span>
        <span class="mini-stat-label">badges</span>
      </div>
    `;

    bar.style.display = 'flex';
  }

  return { init, render };
})();

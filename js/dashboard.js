/**
 * dashboard.js — Personal Dashboard Tab
 * Shows total savings, deals viewed, favorite stores pie chart,
 * wishlist stats, achievement progress, and browsing streak.
 * All data from localStorage. Uses Chart.js for visualizations.
 */

const DashboardModule = (() => {
  let storeChart = null;

  function getStats() {
    const savings     = parseFloat(localStorage.getItem('total_savings') || 0);
    const dealsViewed = parseInt(localStorage.getItem('deals_viewed') || 0, 10);
    const wishlist    = (() => { try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; } })();
    const streak      = parseInt(localStorage.getItem('login_streak') || 0, 10);
    const xp          = parseInt(localStorage.getItem('gamification_xp') || 0, 10);
    const storeData   = (() => { try { return JSON.parse(localStorage.getItem('store_visits') || '{}'); } catch { return {}; } })();
    const searchHist  = (() => { try { return JSON.parse(localStorage.getItem('search_history') || '[]'); } catch { return []; } })();

    return { savings, dealsViewed, wishlist, streak, xp, storeData, searchHist };
  }

  function renderStoreChart(storeData) {
    const canvas = document.getElementById('dash-store-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (storeChart) { storeChart.destroy(); storeChart = null; }

    const entries = Object.entries(storeData).sort((a, b) => b[1] - a[1]).slice(0, 7);
    if (!entries.length) {
      canvas.parentElement.innerHTML = '<p class="dash-empty">No store data yet. Browse some deals!</p>';
      return;
    }

    const labels = entries.map(([name]) => name);
    const values = entries.map(([, v]) => v);
    const colors = ['#00d4ff','#00ff88','#a855f7','#ff6b35','#ffd700','#ff4757','#2ecc71'];

    storeChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: '#e0e0e0', font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} visits` } },
        },
      },
    });
  }

  function render() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    const { savings, dealsViewed, wishlist, streak, xp, storeData, searchHist } = getStats();
    const level = Math.floor(xp / 100) + 1;
    const levelXp = xp % 100;

    container.innerHTML = `
      <div class="dash-grid">

        <!-- Quick Stats Row -->
        <div class="dash-row dash-stats-row">
          <div class="dash-stat-card">
            <div class="dash-stat-icon">💰</div>
            <div class="dash-stat-value">$${savings.toFixed(2)}</div>
            <div class="dash-stat-label">Total Savings</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-icon">👀</div>
            <div class="dash-stat-value">${dealsViewed.toLocaleString()}</div>
            <div class="dash-stat-label">Deals Viewed</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-icon">⭐</div>
            <div class="dash-stat-value">${wishlist.length}</div>
            <div class="dash-stat-label">Wishlisted</div>
          </div>
          <div class="dash-stat-card">
            <div class="dash-stat-icon">🔥</div>
            <div class="dash-stat-value">${streak}</div>
            <div class="dash-stat-label">Day Streak</div>
          </div>
        </div>

        <!-- XP / Level Progress -->
        <div class="dash-card">
          <h3 class="dash-card-title">🏅 Level Progress</h3>
          <div class="dash-level-row">
            <span class="dash-level-badge">Lv ${level}</span>
            <div class="dash-xp-bar-wrap">
              <div class="dash-xp-bar" style="width:${levelXp}%;"></div>
            </div>
            <span class="dash-xp-text">${levelXp}/100 XP</span>
          </div>
          <p class="dash-xp-total">Total XP: <strong>${xp}</strong></p>
        </div>

        <!-- Favorite Stores Chart -->
        <div class="dash-card">
          <h3 class="dash-card-title">🏪 Favorite Stores</h3>
          <div class="dash-chart-wrap">
            <canvas id="dash-store-chart" height="180"></canvas>
          </div>
        </div>

        <!-- Wishlist Stats -->
        <div class="dash-card">
          <h3 class="dash-card-title">⭐ Wishlist Overview</h3>
          ${wishlist.length ? `
            <div class="dash-wishlist-list">
              ${wishlist.slice(0, 5).map(item => `
                <div class="dash-wl-item">
                  ${item.thumb ? `<img src="${escapeHtml(item.thumb)}" alt="" class="dash-wl-thumb" loading="lazy">` : '<span class="dash-wl-icon">🎮</span>'}
                  <span class="dash-wl-title">${escapeHtml(item.title || item.external || '')}</span>
                  ${item.salePrice ? `<span class="dash-wl-price">$${parseFloat(item.salePrice).toFixed(2)}</span>` : ''}
                </div>
              `).join('')}
              ${wishlist.length > 5 ? `<p class="dash-wl-more">+${wishlist.length - 5} more</p>` : ''}
            </div>
          ` : '<p class="dash-empty">Your wishlist is empty. Add games from the Deals tab!</p>'}
        </div>

        <!-- Recent Searches -->
        <div class="dash-card">
          <h3 class="dash-card-title">🔍 Recent Searches</h3>
          ${searchHist.length ? `
            <div class="dash-search-list">
              ${searchHist.slice(0, 8).map(q => `
                <button class="dash-search-chip" data-query="${escapeHtml(q)}">${escapeHtml(q)}</button>
              `).join('')}
            </div>
          ` : '<p class="dash-empty">No searches yet.</p>'}
        </div>

        <!-- Activity -->
        <div class="dash-card dash-card--full">
          <h3 class="dash-card-title">📊 Activity Summary</h3>
          <div class="dash-activity-grid">
            <div class="dash-activity-item">
              <span class="dash-activity-icon">🔍</span>
              <span>${searchHist.length} searches made</span>
            </div>
            <div class="dash-activity-item">
              <span class="dash-activity-icon">📋</span>
              <span>${Object.values(storeData).reduce((a, b) => a + b, 0)} store visits tracked</span>
            </div>
            <div class="dash-activity-item">
              <span class="dash-activity-icon">🏆</span>
              <span>Level ${level} Deal Hunter</span>
            </div>
          </div>
        </div>

      </div>
    `;

    // Store chart
    requestAnimationFrame(() => renderStoreChart(storeData));

    // Search chip click → go to deals tab and search
    container.querySelectorAll('.dash-search-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const q = chip.dataset.query;
        const input = document.getElementById('search-input');
        if (input) { input.value = q; input.dispatchEvent(new Event('input', { bubbles: true })); }
        document.querySelector('[data-tab="deals"]')?.click();
      });
    });
  }

  function init() {
    // Render when tab is first opened
    const tabBtn = document.querySelector('[data-tab="dashboard"]');
    if (tabBtn) {
      tabBtn.addEventListener('click', () => {
        setTimeout(render, 50);
      });
    }
    // Also render if already on dashboard tab
    if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
      render();
    }
  }

  return { init, render };
})();

document.addEventListener('DOMContentLoaded', () => DashboardModule.init());

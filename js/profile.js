/**
 * profile.js — Gaming profile page with stats, heatmap, badges
 */
const ProfileModule = (() => {
  const CLICKED_KEY = 'gdn_clicked_deals';
  const ACTIVITY_KEY = 'gdn_activity_log';
  const FIRST_VISIT_KEY = 'gdn_first_visit';
  const BADGES_KEY = 'gdn_profile_badges';

  function recordFirstVisit() {
    if (!storageGet(FIRST_VISIT_KEY)) {
      storageSet(FIRST_VISIT_KEY, new Date().toISOString());
    }
  }

  function recordActivity() {
    const today = new Date().toISOString().split('T')[0];
    const log = storageGet(ACTIVITY_KEY, {});
    log[today] = (log[today] || 0) + 1;
    storageSet(ACTIVITY_KEY, log);
  }

  function recordClickedDeal(deal) {
    if (!deal || !deal.dealID) return;
    const clicked = storageGet(CLICKED_KEY, []);
    const exists = clicked.find(d => d.dealID === deal.dealID);
    if (!exists) {
      clicked.push({
        dealID: deal.dealID,
        title: deal.title,
        storeID: deal.storeID,
        salePrice: parseFloat(deal.salePrice || 0),
        normalPrice: parseFloat(deal.normalPrice || 0),
        timestamp: Date.now(),
      });
      storageSet(CLICKED_KEY, clicked);
    }
  }

  function getTotalSavings() {
    const clicked = storageGet(CLICKED_KEY, []);
    return clicked.reduce((sum, d) => sum + Math.max(0, (d.normalPrice || 0) - (d.salePrice || 0)), 0);
  }

  function getTopStores() {
    const clicked = storageGet(CLICKED_KEY, []);
    const counts = {};
    clicked.forEach(d => { if (d.storeID) counts[d.storeID] = (counts[d.storeID] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }

  function getHeatmapData() {
    const log = storageGet(ACTIVITY_KEY, {});
    const cells = [];
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cells.push({ date: key, count: log[key] || 0 });
    }
    return cells;
  }

  function getBadges() {
    try {
      if (typeof GamificationModule !== 'undefined') {
        const badges = storageGet('gamification_badges', []);
        return badges.slice(0, 3);
      }
    } catch {}
    return storageGet(BADGES_KEY, []).slice(0, 3);
  }

  function renderProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;

    const savings = getTotalSavings();
    const topStores = getTopStores();
    const heatmapCells = getHeatmapData();
    const badges = getBadges();
    const firstVisit = storageGet(FIRST_VISIT_KEY, null);
    const clicked = storageGet(CLICKED_KEY, []);
    const streak = storageGet('gdn_login_streak', { currentStreak: 0, totalVisits: 0 });
    const memberSince = firstVisit ? new Date(firstVisit).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Today';
    const maxHeat = Math.max(...heatmapCells.map(c => c.count), 1);

    const storeNames = { 1: 'Steam', 2: 'GamersGate', 3: 'GreenManGaming', 7: 'GOG', 8: 'Origin', 11: 'Humble', 13: 'Uplay', 14: 'IndieGala', 15: 'Fanatical', 21: 'WinGameStore', 23: 'GameBillet', 25: 'Voidu', 27: 'Epic', 28: 'WinGameStore', 29: 'GamesPlanet', 31: 'HumbleStore', 35: 'IndieGala', 37: 'Fanatical', 38: 'SilaGames', 101: 'itch.io' };

    container.innerHTML = `
      <div class="profile-stats-grid">
        <div class="profile-stat-card">
          <div class="profile-stat-value">$${savings.toFixed(2)}</div>
          <div class="profile-stat-label">💰 Total Savings</div>
        </div>
        <div class="profile-stat-card">
          <div class="profile-stat-value">${clicked.length}</div>
          <div class="profile-stat-label">🎮 Deals Viewed</div>
        </div>
        <div class="profile-stat-card">
          <div class="profile-stat-value">${streak.currentStreak || 0}🔥</div>
          <div class="profile-stat-label">Current Streak</div>
        </div>
        <div class="profile-stat-card">
          <div class="profile-stat-value">${streak.totalVisits || 0}</div>
          <div class="profile-stat-label">📅 Total Visits</div>
        </div>
      </div>

      ${topStores.length > 0 ? `
        <div class="settings-card" style="margin-top:1.5rem;">
          <h3 class="settings-card-title">🏪 Top Stores</h3>
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            ${topStores.map(([storeID, count]) => `
              <div class="profile-stat-card" style="min-width:120px;">
                <div class="profile-stat-value" style="font-size:1.2rem;">${storeNames[storeID] || 'Store ' + storeID}</div>
                <div class="profile-stat-label">${count} deals</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="settings-card" style="margin-top:1.5rem;">
        <h3 class="settings-card-title">📊 Activity (Last 28 Days)</h3>
        <div class="profile-heatmap" role="grid" aria-label="Activity heatmap">
          ${heatmapCells.map(cell => {
            const opacity = cell.count === 0 ? 0.05 : Math.min(0.2 + (cell.count / maxHeat) * 0.8, 1);
            return `<div class="heatmap-cell" style="background:rgba(0,212,255,${opacity.toFixed(2)});" title="${cell.date}: ${cell.count} visits" role="gridcell"></div>`;
          }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem;">
          <span>4 weeks ago</span><span>Today</span>
        </div>
      </div>

      ${badges.length > 0 ? `
        <div class="settings-card" style="margin-top:1.5rem;">
          <h3 class="settings-card-title">🏅 Recent Badges</h3>
          <div class="profile-badges">
            ${badges.map(b => `
              <div class="profile-stat-card" style="text-align:center;padding:1rem;">
                <div style="font-size:2rem;">${b.emoji || '🏅'}</div>
                <div style="font-size:0.85rem;font-weight:600;margin-top:0.25rem;">${escapeHtml(b.name || b)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="settings-card" style="margin-top:1.5rem;">
        <h3 class="settings-card-title">📌 Member Info</h3>
        <div class="settings-row">
          <div class="settings-label"><strong>Member Since</strong></div>
          <span style="color:var(--accent-blue);">${memberSince}</span>
        </div>
        <div class="settings-row">
          <div class="settings-label"><strong>Longest Streak</strong></div>
          <span style="color:var(--accent-blue);">${streak.longestStreak || 0} days 🔥</span>
        </div>
      </div>
    `;
  }

  function init() {
    recordFirstVisit();
    recordActivity();
  }

  return { init, renderProfile, recordClickedDeal, recordActivity };
})();

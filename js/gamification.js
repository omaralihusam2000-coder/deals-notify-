/**
 * gamification.js — Badges, savings tracker, leaderboard, random deal
 */

const GamificationModule = (() => {
  const STATS_KEY = 'gamification_stats';
  const BADGES_KEY = 'gamification_badges';
  const MAX_RANDOM_PAGES = 5;

  const BADGE_DEFINITIONS = [
    { id: 'first_view',     emoji: '👀', name: 'Window Shopper',   desc: 'Viewed your first deal',         condition: s => s.views >= 1 },
    { id: 'deal_hunter',    emoji: '🔍', name: 'Deal Hunter',      desc: 'Viewed 25 deals',                 condition: s => s.views >= 25 },
    { id: 'deal_master',    emoji: '🎯', name: 'Deal Master',      desc: 'Viewed 100 deals',                condition: s => s.views >= 100 },
    { id: 'first_wishlist', emoji: '⭐', name: 'Wishlist Starter', desc: 'Added first game to wishlist',    condition: s => s.wishlistAdds >= 1 },
    { id: 'collector',      emoji: '🗂️', name: 'Collector',        desc: 'Added 10 games to wishlist',      condition: s => s.wishlistAdds >= 10 },
    { id: 'saver',          emoji: '💰', name: 'Smart Saver',      desc: 'Saved over $50 in total',         condition: s => s.totalSavings >= 50 },
    { id: 'big_saver',      emoji: '💎', name: 'Diamond Saver',    desc: 'Saved over $200 in total',        condition: s => s.totalSavings >= 200 },
    { id: 'explorer',       emoji: '🌍', name: 'World Explorer',   desc: 'Browsed 5 different stores',      condition: s => (s.storesVisited || []).length >= 5 },
    { id: 'free_gamer',     emoji: '🆓', name: 'Free Gamer',       desc: 'Clicked a free game giveaway',    condition: s => s.freeGamesClicked >= 1 },
    { id: 'news_reader',    emoji: '📰', name: 'News Reader',      desc: 'Visited the news section',        condition: s => s.newsVisits >= 1 },
    { id: 'random_deal',    emoji: '🎲', name: 'Feeling Lucky',    desc: 'Used the random deal button',     condition: s => s.randomDeals >= 1 },
    { id: 'commenter',      emoji: '💬', name: 'Community Voice',  desc: 'Posted your first comment',       condition: s => s.comments >= 1 },
    { id: 'deal_sharer',    emoji: '📤', name: 'Deal Sharer',      desc: 'Shared your first deal',          condition: s => s.shares >= 1 },
    { id: 'influencer',     emoji: '📣', name: 'Influencer',       desc: 'Shared 10 deals',                 condition: s => s.shares >= 10 },
    { id: 'quiz_taker',     emoji: '🧠', name: 'Know Thyself',     desc: 'Completed the game quiz',         condition: s => s.quizCompletes >= 1 },
  ];

  function getStats() {
    return storageGet(STATS_KEY, {
      views: 0, wishlistAdds: 0, totalSavings: 0,
      storesVisited: [], freeGamesClicked: 0,
      newsVisits: 0, randomDeals: 0, comments: 0,
      shares: 0, quizCompletes: 0,
    });
  }

  function saveStats(stats) {
    storageSet(STATS_KEY, stats);
  }

  function recordEvent(type, data = {}) {
    const stats = getStats();
    switch (type) {
      case 'view':
        stats.views = (stats.views || 0) + 1;
        if (data.storeID) {
          const visited = stats.storesVisited || [];
          if (!visited.includes(data.storeID)) visited.push(data.storeID);
          stats.storesVisited = visited;
        }
        if (data.normalPrice && data.salePrice) {
          const saved = parseFloat(data.normalPrice) - parseFloat(data.salePrice);
          if (saved > 0) stats.totalSavings = (stats.totalSavings || 0) + saved;
        }
        break;
      case 'wishlist_add':
        stats.wishlistAdds = (stats.wishlistAdds || 0) + 1;
        break;
      case 'free_game_click':
        stats.freeGamesClicked = (stats.freeGamesClicked || 0) + 1;
        break;
      case 'news_visit':
        stats.newsVisits = (stats.newsVisits || 0) + 1;
        break;
      case 'random_deal':
        stats.randomDeals = (stats.randomDeals || 0) + 1;
        break;
      case 'comment':
        stats.comments = (stats.comments || 0) + 1;
        break;
      case 'share':
        stats.shares = (stats.shares || 0) + 1;
        break;
      case 'quiz_complete':
        stats.quizCompletes = (stats.quizCompletes || 0) + 1;
        break;
    }
    saveStats(stats);
    checkNewBadges(stats);
  }

  function getEarnedBadges() {
    return storageGet(BADGES_KEY, []);
  }

  function checkNewBadges(stats) {
    const earned = getEarnedBadges();
    const newBadges = [];
    BADGE_DEFINITIONS.forEach(badge => {
      if (!earned.includes(badge.id) && badge.condition(stats)) {
        earned.push(badge.id);
        newBadges.push(badge);
      }
    });
    if (newBadges.length > 0) {
      storageSet(BADGES_KEY, earned);
      newBadges.forEach(badge => {
        showToast(`🏅 Badge Unlocked: ${badge.name}! ${badge.emoji}`, 'success');
        if (typeof ConfettiModule !== 'undefined') ConfettiModule.burst();
        if (typeof SoundsModule !== 'undefined') SoundsModule.achievement();
      });
    }
    return newBadges;
  }

  function getSavings() {
    return getStats().totalSavings || 0;
  }

  function renderAchievements() {
    const container = document.getElementById('achievements-content');
    if (!container) return;

    const stats = getStats();
    const earned = getEarnedBadges();
    const savings = getSavings();

    container.innerHTML = `
      <div class="achievements-stats">
        <div class="achievement-stat-card">
          <div class="achievement-stat-icon">👀</div>
          <div class="achievement-stat-value">${stats.views || 0}</div>
          <div class="achievement-stat-label">Deals Viewed</div>
        </div>
        <div class="achievement-stat-card">
          <div class="achievement-stat-icon">⭐</div>
          <div class="achievement-stat-value">${stats.wishlistAdds || 0}</div>
          <div class="achievement-stat-label">Wishlisted</div>
        </div>
        <div class="achievement-stat-card">
          <div class="achievement-stat-icon">💰</div>
          <div class="achievement-stat-value">$${savings.toFixed(2)}</div>
          <div class="achievement-stat-label">Total Saved</div>
        </div>
        <div class="achievement-stat-card">
          <div class="achievement-stat-icon">🏅</div>
          <div class="achievement-stat-value">${earned.length}/${BADGE_DEFINITIONS.length}</div>
          <div class="achievement-stat-label">Badges</div>
        </div>
      </div>

      <div class="random-deal-section">
        <h3 class="section-subtitle">🎲 Feeling Lucky?</h3>
        <p class="text-muted">Find a random deal under $5</p>
        <button id="random-deal-btn" class="btn btn-primary btn-lg">
          🎲 Show Random Deal
        </button>
        <div id="random-deal-result"></div>
      </div>

      <div class="badges-section">
        <h3 class="section-subtitle">🏅 Badges (${earned.length}/${BADGE_DEFINITIONS.length})</h3>
        <div class="badges-grid">
          ${BADGE_DEFINITIONS.map(badge => {
            const isEarned = earned.includes(badge.id);
            return `
              <div class="badge-card ${isEarned ? 'badge-earned' : 'badge-locked'}" title="${escapeHtml(badge.desc)}">
                <div class="badge-emoji">${badge.emoji}</div>
                <div class="badge-name">${escapeHtml(badge.name)}</div>
                <div class="badge-desc">${escapeHtml(badge.desc)}</div>
                ${isEarned ? '<div class="badge-check">✅</div>' : '<div class="badge-lock">🔒</div>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const randomBtn = document.getElementById('random-deal-btn');
    if (randomBtn) {
      randomBtn.addEventListener('click', showRandomDeal);
    }
  }

  async function showRandomDeal() {
    const resultDiv = document.getElementById('random-deal-result');
    if (!resultDiv) return;

    const btn = document.getElementById('random-deal-btn');
    if (btn) { btn.disabled = true; btn.textContent = '🎲 Finding deal…'; }

    recordEvent('random_deal');

    try {
      const page = Math.floor(Math.random() * MAX_RANDOM_PAGES);
      const deals = await fetchJSON(`https://www.cheapshark.com/api/1.0/deals?upperPrice=5&pageSize=20&pageNumber=${page}&sortBy=Savings&desc=1`);
      if (!deals || deals.length === 0) throw new Error('No cheap deals found');

      const deal = deals[Math.floor(Math.random() * deals.length)];
      const storeName = typeof DealsModule !== 'undefined' ? DealsModule.getStoreName(deal.storeID) : '';

      resultDiv.innerHTML = `
        <div class="random-deal-card">
          <img class="random-deal-img" src="${escapeHtml(deal.thumb)}" alt="${escapeHtml(deal.title)}" loading="lazy">
          <div class="random-deal-info">
            <h4 class="random-deal-title">${escapeHtml(deal.title)}</h4>
            <p class="random-deal-store">${escapeHtml(storeName)}</p>
            <div class="random-deal-price-row">
              <span class="price-sale">$${parseFloat(deal.salePrice).toFixed(2)}</span>
              <span class="badge badge-green">-${Math.round(parseFloat(deal.savings))}%</span>
            </div>
            <a class="btn btn-primary btn-sm"
               href="https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}"
               target="_blank" rel="noopener noreferrer">
              Get Deal 🎲
            </a>
          </div>
        </div>
      `;
    } catch (err) {
      resultDiv.innerHTML = `<p class="text-error">Could not find a deal: ${escapeHtml(err.message)}</p>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🎲 Try Again'; }
    }
  }

  function init() {
    renderAchievements();
  }

  return { recordEvent, getStats, getSavings, renderAchievements, showRandomDeal, checkNewBadges, init };
})();
